import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { marked } from 'marked'
import { checkRateLimit } from '@/lib/rate-limit'

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
    const { projectId, clientEmail, costEstimate, timelineEstimate, reportMarkdown, projectName } = body

    if (!projectId || !clientEmail || !reportMarkdown) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Verify ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return new Response('Project not found or unauthorized', { status: 403 })
    }

    // Convert markdown to HTML
    const reportHtml = await marked.parse(reportMarkdown)

    // Build Email HTML
    let costTimelineHtml = ''
    if (costEstimate || timelineEstimate) {
      costTimelineHtml = `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h3 style="margin-top: 0; color: #0f172a;">Project Estimates</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${costEstimate ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 150px;">Estimated Cost:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${costEstimate}</td></tr>` : ''}
            ${timelineEstimate ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #475569; width: 150px;">Estimated Timeline:</td><td style="padding: 8px 0; color: #0f172a;">${timelineEstimate}</td></tr>` : ''}
          </table>
        </div>
      `
    }

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
        <h1 style="color: #0f172a; margin-bottom: 24px;">Project Proposal: ${projectName}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569;">
          Hello,
          <br><br>
          Based on our recent discovery sessions, we have prepared the following proposal and requirements document for your project.
        </p>

        ${costTimelineHtml}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <div style="font-size: 14px; line-height: 1.6; color: #334155;">
          ${reportHtml}
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          Sent securely via ProjectPilot
        </p>
      </div>
    `

    const senderEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    
    // Send the email
    const { data, error } = await resend.emails.send({
      from: `ProjectPilot <${senderEmail}>`,
      to: [clientEmail],
      subject: `Project Proposal: ${projectName}`,
      html: emailHtml,
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
