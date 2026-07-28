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
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
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
    let finalProposalMarkdown = proposalMarkdown
      .replace(/\[PLACEHOLDER:\s*Estimated Timeline[^\]]*\]/gi, validatedTimeline)
      .replace(/\[PLACEHOLDER:\s*Project Cost[^\]]*\]/gi, validatedCost)

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

    // ── Generate PDF from proposal markdown ──
    console.log('[PROPOSAL] Generating PDF...')
    const pdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageHeight = pdfDoc.internal.pageSize.getHeight()
    const pageWidth = pdfDoc.internal.pageSize.getWidth()
    const margin = 15
    const maxWidth = pageWidth - margin * 2

    let yPosition = margin
    const lineHeight = 5
    const pageHeightLimit = pageHeight - margin

    // Split markdown into lines and render
    const lines = pdfSafeMarkdown.split('\n')
    pdfDoc.setFontSize(11)
    pdfDoc.setFont('helvetica', 'normal')

    for (const line of lines) {
      const trimmed = line.trim()

      // Handle section headings
      if (trimmed.startsWith('## ')) {
        if (yPosition > margin) yPosition += 5
        pdfDoc.setFontSize(13)
        pdfDoc.setFont('helvetica', 'bold')
        pdfDoc.setTextColor(26, 35, 64)
        const title = trimmed.slice(3)
        const splitTitle = pdfDoc.splitTextToSize(title, maxWidth)
        pdfDoc.text(splitTitle, margin, yPosition)
        yPosition += splitTitle.length * lineHeight + 3
        pdfDoc.setFontSize(11)
        pdfDoc.setFont('helvetica', 'normal')
        pdfDoc.setTextColor(0, 0, 0)
      } else if (trimmed === '') {
        yPosition += 2
      } else {
        const splitText = pdfDoc.splitTextToSize(trimmed, maxWidth)
        for (const textLine of splitText) {
          if (yPosition > pageHeightLimit) {
            pdfDoc.addPage()
            yPosition = margin
          }
          pdfDoc.text(textLine, margin, yPosition)
          yPosition += lineHeight
        }
      }

      // Check for page break
      if (yPosition > pageHeightLimit) {
        pdfDoc.addPage()
        yPosition = margin
      }
    }

    const pdfBlob = pdfDoc.output('blob')
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    const base64Pdf = pdfBuffer.toString('base64')

    console.log('[PROPOSAL] PDF generated:', pdfBuffer.length, 'bytes')

    // ── BUG FIX #4: Use branded HTML template ──
    const agencyDetails = parseAgencyDetails(profile)
    const agencyName = agencyDetails?.name || 'ProjectPilot'
    const agencyEmail = agencyDetails?.email || process.env.RESEND_FROM_EMAIL || 'hello@projectpilot.com'
    const proposalLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/workspace/${projectId}`

    // Build WhatsApp CTA link with URL-encoded prefilled message using brand name
    const waMessage = `Hey, I'm from ${agencyName}, let's schedule the kickoff call.`
    const whatsappLink = `https://wa.me/9265037415?text=${encodeURIComponent(waMessage)}`

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
