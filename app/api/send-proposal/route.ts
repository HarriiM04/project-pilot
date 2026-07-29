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
import { generateProposalEmailHTML, renderEmailTemplate } from '@/lib/proposal-email-template'

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

    // Validate and format cost
    let formattedCost = 'TBD'
    if (costEstimate) {
      try {
        formattedCost = validateAndFormatCost(costEstimate)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid cost'
        return new Response(msg, { status: 400 })
      }
    }

    // Validate and format timeline
    let formattedTimeline = 'TBD'
    if (timelineEstimate) {
      try {
        formattedTimeline = validateAndFormatTimeline(timelineEstimate)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid timeline'
        return new Response(msg, { status: 400 })
      }
    }

    // Bug Fix #3: Sanitize internal notes from report markdown
    const sanitizedMarkdown = sanitizeNextStepsSection(reportMarkdown)

    // Fetch profile with correct column names that parseAgencyDetails expects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_admin, full_name, avatar_url')
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

    // Build proposal link and WhatsApp CTA link
    const proposalLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/workspace/${projectId}`
    const agencyNameForWA = agencyDetails.name || 'ProjectPilot'
    const waMessage = `Hey, I'm from ${agencyNameForWA}, let's schedule the kickoff call.`
    const whatsappLink = `https://wa.me/9265037415?text=${encodeURIComponent(waMessage)}`

    const emailTemplate = generateProposalEmailHTML({
      CLIENT_NAME: clientName || 'Valued Client',
      PROJECT_NAME: projectName,
      ESTIMATED_TIMELINE: formattedTimeline,
      ESTIMATED_COST: formattedCost,
      KEY_DELIVERABLES: 'See attached proposal',
      PROPOSAL_LINK: proposalLink,
      WHATSAPP_LINK: whatsappLink,
      AGENCY_NAME: agencyDetails.name,
      AGENCY_EMAIL: agencyDetails.email || process.env.RESEND_FROM_EMAIL || 'hello@projectpilot.com',
      PRIMARY_COLOR: '#4F46E5'
    })
    const emailHTML = renderEmailTemplate(emailTemplate, {
      CLIENT_NAME: clientName || 'Valued Client',
      PROJECT_NAME: projectName,
      ESTIMATED_TIMELINE: formattedTimeline,
      ESTIMATED_COST: formattedCost,
      KEY_DELIVERABLES: 'See attached proposal',
      PROPOSAL_LINK: proposalLink,
      WHATSAPP_LINK: whatsappLink,
      AGENCY_NAME: agencyDetails.name,
      AGENCY_EMAIL: agencyDetails.email || process.env.RESEND_FROM_EMAIL || 'hello@projectpilot.com',
      PRIMARY_COLOR: '#4F46E5'
    })

    // Validate template has all placeholders filled
    const templateValidation = validateEmailTemplate(emailHTML)
    if (!templateValidation.valid) {
      console.error('Email template validation failed:', templateValidation.missing)
      return new Response(`Email template error: missing ${templateValidation.missing.join(', ')}`, { status: 500 })
    }

    // Always send FROM the verified domain (RESEND_FROM_EMAIL).
    // Resend only allows sending from verified domains — gmail/personal domains will be rejected.
    // The agency email goes into Reply-To so replies land in the right inbox.
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@projectpilot.com'
    const replyToEmail = agencyDetails.email || fromEmail

    // Send the email
    const { data, error } = await resend.emails.send({
      from: `${agencyDetails.name} <${fromEmail}>`,
      replyTo: replyToEmail,
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
