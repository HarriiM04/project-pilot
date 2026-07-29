import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { jsPDF } from 'jspdf'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseAgencyDetails } from '@/lib/utils'
import {
  validateAndFormatCost,
  validateAndFormatTimeline,
  sanitizeNextStepsSection,
  validateEmailTemplate,
} from '@/lib/proposal-parser'
import {
  generateProposalEmailHTML,
  renderEmailTemplate,
  type EmailTemplateVariables,
} from '@/lib/proposal-email-template'
import { storeProposalPdf, buildWhatsAppLink } from '@/lib/proposal-actions'

const resend = new Resend(process.env.RESEND_API_KEY)

export const runtime = 'nodejs'
export const maxDuration = 60

// Text sanitization for PDF (same as report generation)
function sanitizeForPDF(text: string): string {
  return text
    .replace(/\s*→\s*/g, ' -> ')
    .replace(/\s*←\s*/g, ' <- ')
    .replace(/\s*↓\s*/g, ' [down] ')
    .replace(/\s*↑\s*/g, ' [up] ')
    .replace(/\s*↔\s*/g, ' <-> ')
    .replace(/\s*–\s*/g, '-')
    .replace(/\s*—\s*/g, '-')
    .replace(/\s*•\s*/g, '* ')
    .replace(/\s*°\s*/g, ' deg ')
    .replace(/\s*±\s*/g, ' +/- ')
    .replace(/\s*×\s*/g, ' x ')
    .replace(/\s*÷\s*/g, ' / ')
    .replace(/\s*≈\s*/g, ' approx ')
    .replace(/\s*≠\s*/g, ' != ')
    .replace(/\s*≤\s*/g, ' <= ')
    .replace(/\s*≥\s*/g, ' >= ')
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/…/g, '...')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * POST /api/proposal/send
 * Finalize proposal with cost/timeline, generate PDF, and send via email
 * 
 * Body:
 * - projectId: string
 * - clientEmail: string (required)
 * - clientName: string (required) [NEW]
 * - finalCost: string (required, replaces placeholder)
 * - estimatedTimeline: string (required, replaces placeholder)
 * - proposalMarkdown: string (current draft to finalize)
 * - expiryDate?: string (optional ISO date)
 * - personalMessage?: string (optional, defaults to standard message)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!checkRateLimit(user.id, 5, 60000)) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const {
      projectId,
      clientEmail,
      clientName,
      finalCost,
      estimatedTimeline,
      proposalMarkdown,
      expiryDate,
      personalMessage,
      breakdown,
    } = body

    // Validate required fields
    if (!projectId || !clientEmail || !clientName || !finalCost || !estimatedTimeline || !proposalMarkdown) {
      return new Response('Missing required fields: projectId, clientEmail, clientName, finalCost, estimatedTimeline, proposalMarkdown', { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(clientEmail)) {
      return new Response('Invalid email format', { status: 400 })
    }

    // Verify project ownership or admin status
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project) {
      return new Response('Project not found', { status: 403 })
    }

    // Fetch full profile so parseAgencyDetails can extract agency name/email from full_name JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_admin, full_name, avatar_url')
      .eq('id', user.id)
      .single()
    const isAdmin = !!profile?.is_admin

    if (!isAdmin && project.user_id !== user.id) {
      return new Response('Forbidden', { status: 403 })
    }

    // ── BUG FIX #1: Validate and format cost (prevent garbled numbers) ──
    let validatedCost: string
    try {
      validatedCost = validateAndFormatCost(finalCost)
      console.log('[PROPOSAL] Cost validated:', validatedCost)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid cost format'
      console.error('[PROPOSAL] Cost validation failed:', finalCost, '→', msg)
      return new Response(`Cost validation failed: ${msg}`, { status: 400 })
    }

    // ── BUG FIX #2: Validate and format timeline (ensure unit is included) ──
    let validatedTimeline: string
    try {
      validatedTimeline = validateAndFormatTimeline(estimatedTimeline)
      console.log('[PROPOSAL] Timeline validated:', validatedTimeline)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid timeline format'
      console.error('[PROPOSAL] Timeline validation failed:', estimatedTimeline, '→', msg)
      return new Response(`Timeline validation failed: ${msg}`, { status: 400 })
    }

    // ── Finalize proposal by replacing placeholders ──
    let costReplacement = validatedCost
    if (breakdown && Array.isArray(breakdown) && breakdown.length > 0) {
      costReplacement += '\n\n**Cost & Timeline Breakdown:**\n'
      breakdown.forEach((item: any) => {
        costReplacement += `\n* **${item.title}**: ${item.cost} (${item.timeline})`
        if (item.description) {
          costReplacement += `\n  ${item.description}`
        }
      })
      costReplacement += '\n'
    }

    let finalProposalMarkdown = proposalMarkdown
      .replace(/\[PLACEHOLDER:\s*Estimated Timeline[^\]]*\]/gi, validatedTimeline)
      .replace(/\[PLACEHOLDER:\s*Project Cost[^\]]*\]/gi, costReplacement)

    // Sanitize any internal-notes content across all sections
    finalProposalMarkdown = sanitizeNextStepsSection(finalProposalMarkdown)

    // Add expiry date to Next Steps if provided
    if (expiryDate) {
      const expiryDateFormatted = new Date(expiryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      finalProposalMarkdown = finalProposalMarkdown.replace(
        /(## 10\.\s*Next Steps\n+)/i,
        `$1**Proposal Valid Until:** ${expiryDateFormatted}\n\n`
      )
    }

    // Sanitize all text for PDF rendering
    const pdfSafeMarkdown = sanitizeForPDF(finalProposalMarkdown)

    // ── Parse Agency Details for Branding ──
    const agencyDetails = parseAgencyDetails(profile)
    const agencyName = agencyDetails?.name || 'ProjectPilot'
    const agencyEmail = agencyDetails?.email || process.env.RESEND_FROM_EMAIL || 'hello@projectpilot.com'
    const brandColor: [number, number, number] = [79, 70, 229] // Default Indigo (Tailwind #4F46E5)
    
    let logoBase64: string | null = null
    let logoFormat = 'PNG'
    if (agencyDetails?.logo) {
      try {
        const logoUrl = new URL(agencyDetails.logo, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').href
        const logoRes = await fetch(logoUrl)
        if (logoRes.ok) {
          const contentType = logoRes.headers.get('content-type') || ''
          logoFormat = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG'
          const logoBuffer = await logoRes.arrayBuffer()
          logoBase64 = Buffer.from(logoBuffer).toString('base64')
        }
      } catch (e) {
        console.error('[PROPOSAL] Failed to fetch agency logo', e)
      }
    }

    // ── Generate PDF from proposal markdown ──
    console.log('[PROPOSAL] Generating Professional PDF...')
    const pdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageHeight = pdfDoc.internal.pageSize.getHeight()
    const pageWidth = pdfDoc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    const lineHeight = 6
    const pageHeightLimit = pageHeight - margin - 15 // Leave space for footer
    
    // --- PHASE 1: Cover Page ---
    let yPosition = margin + 10
    
    // Draw Logo
    if (logoBase64) {
      pdfDoc.addImage(logoBase64, logoFormat, margin, yPosition, 25, 25)
      yPosition += 45
    } else {
      yPosition += 25
    }

    // Draw Proposal Title
    pdfDoc.setFontSize(28)
    pdfDoc.setFont('helvetica', 'bold')
    pdfDoc.setTextColor(brandColor[0], brandColor[1], brandColor[2])
    const titleText = 'Project Proposal'
    pdfDoc.text(titleText, margin, yPosition)
    yPosition += 15

    // Draw Project Name
    pdfDoc.setFontSize(18)
    pdfDoc.setFont('helvetica', 'normal')
    pdfDoc.setTextColor(40, 50, 75)
    const splitProjectName = pdfDoc.splitTextToSize(project.title || 'Custom Project', maxWidth)
    pdfDoc.text(splitProjectName, margin, yPosition)
    yPosition += splitProjectName.length * 8 + 20

    // Draw Highlight Box for Client & Date
    pdfDoc.setFillColor(248, 250, 252) // slate-50
    pdfDoc.setDrawColor(226, 232, 240) // slate-200
    pdfDoc.rect(margin, yPosition, maxWidth, 45, 'FD')
    
    yPosition += 12
    pdfDoc.setFontSize(10)
    pdfDoc.setFont('helvetica', 'bold')
    pdfDoc.setTextColor(100, 116, 139) // slate-500
    pdfDoc.text('PREPARED FOR', margin + 8, yPosition)
    pdfDoc.text('PREPARED BY', margin + maxWidth / 2, yPosition)
    
    yPosition += 8
    pdfDoc.setFontSize(14)
    pdfDoc.setFont('helvetica', 'bold')
    pdfDoc.setTextColor(15, 23, 42) // slate-900
    const splitClient = pdfDoc.splitTextToSize(clientName, maxWidth / 2 - 16)
    const splitAgency = pdfDoc.splitTextToSize(agencyName, maxWidth / 2 - 16)
    pdfDoc.text(splitClient, margin + 8, yPosition)
    pdfDoc.text(splitAgency, margin + maxWidth / 2, yPosition)
    
    yPosition += Math.max(splitClient.length, splitAgency.length) * 6 + 4
    pdfDoc.setFontSize(10)
    pdfDoc.setFont('helvetica', 'normal')
    pdfDoc.setTextColor(100, 116, 139)
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    pdfDoc.text(`Date: ${dateStr}`, margin + 8, yPosition)

    // --- PHASE 2: Reserved TOC Page ---
    pdfDoc.addPage()
    const tocPageNumber = 2

    // --- PHASE 3: Content Parsing & Layout ---
    pdfDoc.addPage() // Start content on Page 3
    yPosition = margin

    const lines = pdfSafeMarkdown.split('\n')
    const tocEntries: { title: string; page: number; level: number }[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed === '') {
        yPosition += 3
        continue
      }

      // Handle section headings
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)/)
      if (headingMatch) {
        const level = headingMatch[1].length
        let title = headingMatch[2]
        
        // Remove markdown bold from headings if any leaked through
        title = title.replace(/\*\*/g, '').replace(/__/g, '')
        
        if (yPosition > margin) yPosition += (level === 1 ? 10 : 7)
        
        // Check for page break
        if (yPosition > pageHeightLimit - 15) {
          pdfDoc.addPage()
          yPosition = margin
        }
        
        // Track TOC for H2 and H3
        if (level === 2 || level === 3) {
          tocEntries.push({ title, page: pdfDoc.getCurrentPageInfo().pageNumber, level })
        }
        
        pdfDoc.setFontSize(level === 1 ? 18 : level === 2 ? 14 : 12)
        pdfDoc.setFont('helvetica', 'bold')
        if (level === 2) {
          pdfDoc.setTextColor(brandColor[0], brandColor[1], brandColor[2])
        } else {
          pdfDoc.setTextColor(30, 41, 59)
        }
        
        const splitTitle = pdfDoc.splitTextToSize(title, maxWidth)
        pdfDoc.text(splitTitle, margin, yPosition)
        yPosition += splitTitle.length * lineHeight + (level === 1 ? 4 : 2)
        
        // Draw divider for H2
        if (level === 2) {
          pdfDoc.setDrawColor(226, 232, 240)
          pdfDoc.line(margin, yPosition - 2, margin + maxWidth, yPosition - 2)
          yPosition += 4
        }
      } else {
        // Handle body text and list items
        let textToRender = trimmed
        let indent = margin
        let textWidth = maxWidth
        
        pdfDoc.setFontSize(11)
        pdfDoc.setFont('helvetica', 'normal')
        pdfDoc.setTextColor(51, 65, 85)
        
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          textToRender = '• ' + trimmed.slice(2)
          indent = margin + 5
          textWidth = maxWidth - 5
        } else if (trimmed.match(/^\d+\.\s/)) {
          indent = margin + 5
          textWidth = maxWidth - 5
        }
        
        const splitText = pdfDoc.splitTextToSize(textToRender, textWidth)
        for (const textLine of splitText) {
          if (yPosition > pageHeightLimit) {
            pdfDoc.addPage()
            yPosition = margin
          }
          pdfDoc.text(textLine, indent, yPosition)
          yPosition += lineHeight
        }
      }
    }

    // --- PHASE 4: Draw Table of Contents ---
    pdfDoc.setPage(tocPageNumber)
    let tocY = margin + 10
    
    pdfDoc.setFontSize(18)
    pdfDoc.setFont('helvetica', 'bold')
    pdfDoc.setTextColor(brandColor[0], brandColor[1], brandColor[2])
    pdfDoc.text('Table of Contents', margin, tocY)
    tocY += 15
    
    pdfDoc.setFontSize(11)
    pdfDoc.setTextColor(51, 65, 85)
    
    for (const entry of tocEntries) {
      if (tocY > pageHeightLimit - 10) break // Skip if TOC overflows single page for now
      
      const isSub = entry.level === 3
      const tocIndent = margin + (isSub ? 8 : 0)
      
      pdfDoc.setFont('helvetica', isSub ? 'normal' : 'bold')
      pdfDoc.text(entry.title, tocIndent, tocY)
      pdfDoc.text(entry.page.toString(), pageWidth - margin, tocY, { align: 'right' })
      
      // Draw dotted leader
      pdfDoc.setFont('helvetica', 'normal')
      const titleWidth = pdfDoc.getTextWidth(entry.title)
      const numWidth = pdfDoc.getTextWidth(entry.page.toString())
      const dotSpace = 3
      let dotX = tocIndent + titleWidth + 3
      const endX = pageWidth - margin - numWidth - 3
      
      while (dotX < endX) {
        pdfDoc.text('.', dotX, tocY)
        dotX += dotSpace
      }
      
      tocY += isSub ? 7 : 9
    }

    // --- PHASE 5: Draw Footers on All Pages ---
    const totalPages = pdfDoc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdfDoc.setPage(i)
      const footerY = pageHeight - 12
      
      // Divider line
      pdfDoc.setDrawColor(226, 232, 240)
      pdfDoc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
      
      pdfDoc.setFontSize(8)
      pdfDoc.setFont('helvetica', 'normal')
      pdfDoc.setTextColor(148, 163, 184) // slate-400
      
      pdfDoc.text(`Prepared by ${agencyName}`, margin, footerY)
      pdfDoc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' })
      pdfDoc.text('Powered by ProjectPilot', pageWidth - margin, footerY, { align: 'right' })
    }

    const pdfBlob = pdfDoc.output('blob')
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    const base64Pdf = pdfBuffer.toString('base64')

    console.log('[PROPOSAL] Premium PDF generated:', pdfBuffer.length, 'bytes')

    // ── BUG FIX #4: Use branded HTML template ──
    const proposalLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/proposal/download/${projectId}`
    const whatsappLink = buildWhatsAppLink(clientName, project.title || 'Your Project', agencyName)

    const emailVariables: EmailTemplateVariables = {
      CLIENT_NAME: clientName,
      PROJECT_NAME: project.title || 'Your Project',
      PROPOSAL_LINK: proposalLink,
      WHATSAPP_LINK: whatsappLink,
      AGENCY_NAME: agencyName,
      AGENCY_EMAIL: agencyEmail,
      PRIMARY_COLOR: '#4F46E5',
      ESTIMATED_COST: validatedCost,
      ESTIMATED_TIMELINE: validatedTimeline,
      KEY_DELIVERABLES: 'Full 12-section proposal attached',
    }

    // Generate HTML email
    const emailTemplate = generateProposalEmailHTML(emailVariables)
    const emailHTML = renderEmailTemplate(emailTemplate, emailVariables)

    // ── Validate email template (all placeholders filled) ──
    const validation = validateEmailTemplate(emailHTML)
    if (!validation.valid) {
      const errorMsg = `Email template validation failed: Missing placeholders: ${validation.missing.join(', ')}`
      console.error('[PROPOSAL] Email validation error:', errorMsg)
      return new Response(errorMsg, { status: 500 })
    }

    console.log('[PROPOSAL] Email template validated successfully')

    // ── Send email with branded HTML + PDF attachment ──
    // Always send FROM the verified domain. Agency email goes to Reply-To.
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const replyToEmail = emailVariables.AGENCY_EMAIL || senderEmail

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${emailVariables.AGENCY_NAME} <${senderEmail}>`,
      replyTo: replyToEmail,
      to: [clientEmail],
      subject: `Your Project Proposal: ${project.title}`,
      html: emailHTML,
      attachments: [
        {
          filename: `proposal-${project.title.replace(/\s+/g, '-')}.pdf`,
          content: base64Pdf,
        },
      ],
    })

    if (emailError) {
      console.error('[PROPOSAL SEND] Email error:', emailError)
      return new Response(`Email send failed: ${emailError.message}`, { status: 400 })
    }

    console.log('[PROPOSAL] Email sent successfully (ID:', emailData?.id, ')')

    // ── Store PDF permanently ──
    let storedPdfPath = null
    try {
      const result = await storeProposalPdf(supabase, pdfBuffer, projectId, user.id)
      storedPdfPath = result.path
      console.log('[PROPOSAL] PDF stored successfully at:', storedPdfPath)
    } catch (e) {
      console.error('[PROPOSAL] Failed to store PDF in Supabase Storage:', e)
    }

    // Update proposal status in database
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'sent',
        proposal_markdown: finalProposalMarkdown, // Store original (not PDF-sanitized)
        client_email: clientEmail,
        final_cost: validatedCost,
        estimated_timeline: validatedTimeline,
        expiry_date: expiryDate || null,
        personal_message: personalMessage || null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)

    if (updateError) {
      console.error('[PROPOSAL SEND] Database update error:', updateError)
      return new Response('Failed to update proposal status', { status: 500 })
    }

    console.log('[PROPOSAL SEND] Proposal sent successfully to:', clientEmail)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Proposal sent successfully',
        emailId: emailData?.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PROPOSAL SEND] Server error:', msg)
    return new Response(msg, { status: 500 })
  }
}
