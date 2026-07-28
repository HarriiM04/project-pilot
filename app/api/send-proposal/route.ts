import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseAgencyDetails } from '@/lib/utils'
import {
  validateAndFormatCost,
  validateAndFormatTimeline,
  sanitizeNextStepsSection,
  validateEmailTemplate
} from '@/lib/proposal-parser'
import { generateProposalEmailHTML } from '@/lib/proposal-email-template'

const resend = new Resend(process.env.RESEND_API_KEY)

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!checkRateLimit(user.id, 10, 60000)) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    const body = await req.json()
    const { projectId, clientEmail, clientName, costEstimate, timelineEstimate, reportMarkdown, projectName } = body

    if (!projectId || !clientEmail || !reportMarkdown || !projectName) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Bug Fix #1: Validate and format cost
    let formattedCost = 'TBD'
    if (costEstimate) {
      const costResult = validateAndFormatCost(costEstimate)
      if (!costResult.valid) {
        return new Response(`Invalid cost: ${costResult.error}`, { status: 400 })
      }
      formattedCost = costResult.formatted || 'TBD'
    }

    // Bug Fix #2: Validate and format timeline
    let formattedTimeline = 'TBD'
    if (timelineEstimate) {
      const timelineResult = validateAndFormatTimeline(timelineEstimate)
      if (!timelineResult.valid) {
        return new Response(`Invalid timeline: ${timelineResult.error}`, { status: 400 })
      }
      formattedTimeline = timelineResult.formatted || 'TBD'
    }

    // Bug Fix #3: Sanitize internal notes from report markdown
    const sanitizedMarkdown = sanitizeNextStepsSection(reportMarkdown)

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, agency_name, agency_logo')
      .eq('id', user.id)
      .single()
    const isAdmin = !!profile?.is_admin

    let agencyDetails: { name: string; logo: string; email?: string } | null = null
    if (isAdmin) {
      const agency = parseAgencyDetails(profile)
      if (!agency || !agency.name || !agency.logo) {
        return new Response('Agency profile is incomplete. Please set your Agency Name and Logo in Admin settings first.', { status: 400 })
      }
      agencyDetails = {
        name: agency.name,
        logo: agency.logo,
        email: agency.email || process.env.RESEND_FROM_EMAIL || 'hello@projectpilot.com'
      }
    } else {
      // Non-admin fallback
      agencyDetails = {
        name: 'ProjectPilot',
        logo: 'https://projectpilot.com/logo.png',
        email: process.env.RESEND_FROM_EMAIL || 'hello@projectpilot.com'
      }
    }

    // Verify ownership or admin
    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (!project || (!isAdmin && project.user_id !== user.id)) {
      return new Response('Project not found or unauthorized', { status: 403 })
    }

    // Bug Fix #4: Generate branded HTML email template
    const emailHTML = generateProposalEmailHTML({
      clientName: clientName || 'Valued Client',
      projectName,
      timeline: formattedTimeline,
      budgetRange: formattedCost,
      keyDeliverables: 'See attached proposal',
      proposalLink: '#', // Can be updated if PDF storage is implemented
      agencyName: agencyDetails.name,
      agencyEmail: agencyDetails.email,
      agencyLogo: agencyDetails.logo,
      primaryColor: '#2d6ef5'
    })

    // Validate template has all placeholders filled
    const templateValidation = validateEmailTemplate(emailHTML)
    if (!templateValidation.valid) {
      console.error('Email template validation failed:', templateValidation.error)
      return new Response(`Email template error: ${templateValidation.error}`, { status: 500 })
    }

    const senderEmail = agencyDetails.email
    
    // Send the email
    const { data, error } = await resend.emails.send({
      from: `${agencyDetails.name} <${senderEmail}>`,
      to: [clientEmail],
      subject: `Project Proposal: ${projectName}`,
      html: emailHTML,
    })

    if (error) {
      console.error('Resend Error:', error)
      return new Response(error.message, { status: 400 })
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Send Proposal Error:', err)
    return new Response(msg, { status: 500 })
  }
}
