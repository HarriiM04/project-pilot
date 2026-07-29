import type { NextRequest } from 'next/server'
import { sendProposal, type SendProposalInput } from '@/lib/send-proposal'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/proposal-mailer
 * 
 * Generate a proposal PDF and send it to a client via branded email
 * 
 * Request body:
 * {
 *   "projectData": { project_name, subtitle?, estimated_cost, estimated_timeline, sections[] },
 *   "clientEmail": "client@example.com",
 *   "clientName": "John Doe",
 *   "agencyConfig": { name, email, calendlyLink, primaryColor },
 *   "proposalLink": "https://example.com/proposals/abc123"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400 }
      )
    }

    const {
      projectData,
      clientEmail,
      clientName,
      agencyConfig,
      proposalLink,
      includeAttachment,
    } = body

    // Validate required fields
    if (!projectData || !clientEmail || !clientName || !agencyConfig || !proposalLink) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: projectData, clientEmail, clientName, agencyConfig, proposalLink',
        }),
        { status: 400 }
      )
    }

    // Validate projectData structure
    if (!projectData.project_name || !projectData.estimated_cost || !projectData.estimated_timeline || !projectData.sections) {
      return new Response(
        JSON.stringify({
          error: 'projectData must include: project_name, estimated_cost, estimated_timeline, sections',
        }),
        { status: 400 }
      )
    }

    // Validate agencyConfig
    if (!agencyConfig.name || !agencyConfig.email || !agencyConfig.calendlyLink || !agencyConfig.primaryColor) {
      return new Response(
        JSON.stringify({
          error: 'agencyConfig must include: name, email, calendlyLink, primaryColor',
        }),
        { status: 400 }
      )
    }

    console.log(`[PROPOSAL-MAILER] Sending proposal for ${projectData.project_name} to ${clientEmail}`)

    // Send the proposal
    const result = await sendProposal({
      projectData,
      clientEmail,
      clientName,
      agencyConfig,
      proposalLink,
      includeAttachment,
    })

    if (!result.success) {
      console.error(`[PROPOSAL-MAILER] Failed:`, result.message)
      return new Response(
        JSON.stringify(result),
        { status: 400 }
      )
    }

    console.log(`[PROPOSAL-MAILER] Success: ${result.message}`)

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[PROPOSAL-MAILER] Server error:`, msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500 }
    )
  }
}
