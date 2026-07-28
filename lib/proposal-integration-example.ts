/**
 * Integration Example: How to use the Proposal System in your existing workflow
 * 
 * This file shows real-world scenarios for integrating proposals into:
 * 1. The existing KickoffReportViewer component
 * 2. An admin dashboard for proposal management
 * 3. A discovery completion webhook
 */

import { sendProposal, type SendProposalInput, type AgencyConfig } from '@/lib/send-proposal'
import type { ProjectData } from '@/lib/proposal-pdf-generator'

/**
 * Scenario 1: After Discovery is Complete
 * 
 * When a PM finishes the discovery conversation and generates the KICKOFF report,
 * they want to instantly create a proposal and send it to the client.
 */
export async function handleDiscoveryCompletion({
  projectId,
  discoveryState,
  extractedJson,
  clientEmail,
  clientName,
  agencyDetails,
}: {
  projectId: string
  discoveryState: any // from discovery-store
  extractedJson: any // from kickoff_reports.extracted_json
  clientEmail: string
  clientName: string
  agencyDetails: any
}): Promise<{ success: boolean; proposalId?: string; error?: string }> {
  try {
    // Step 1: Transform extracted requirements into ProjectData
    const projectData = transformKickoffToProjectData(
      discoveryState,
      extractedJson
    )

    // Step 2: Get or create agency config from admin profile
    const agencyConfig = buildAgencyConfig(agencyDetails)

    // Step 3: Generate proposal link (could be a share link, preview URL, etc.)
    const proposalLink = `${process.env.NEXT_PUBLIC_SITE_URL}/proposals/${projectId}`

    // Step 4: Send proposal
    const result = await sendProposal({
      projectData,
      clientEmail,
      clientName,
      agencyConfig,
      proposalLink,
      includeAttachment: true,
    })

    if (result.success) {
      // Step 5: Store proposal record in database (optional)
      await storeProposalRecord({
        projectId,
        emailId: result.emailId,
        sentTo: clientEmail,
        projectData,
      })

      return {
        success: true,
        proposalId: result.emailId,
      }
    } else {
      return {
        success: false,
        error: result.message,
      }
    }
  } catch (error) {
    console.error('[INTEGRATION] Discovery completion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Scenario 2: Manual Proposal Creation via Admin Dashboard
 * 
 * An admin can manually create a custom proposal with drag-and-drop sections
 * and send it immediately.
 */
export async function handleManualProposalCreation({
  projectId,
  formData,
}: {
  projectId: string
  formData: {
    projectName: string
    subtitle?: string
    estimatedCost: string
    estimatedTimeline: string
    sections: Array<{ heading: string; content: string; bullets?: string[] }>
    clientEmail: string
    clientName: string
  }
}): Promise<{ success: boolean; message: string }> {
  try {
    // Step 1: Build ProjectData from form input
    const projectData: ProjectData = {
      project_name: formData.projectName,
      subtitle: formData.subtitle,
      estimated_cost: formData.estimatedCost,
      estimated_timeline: formData.estimatedTimeline,
      sections: formData.sections.map((section) => ({
        heading: section.heading,
        text: section.content,
        bullets: section.bullets,
      })),
    }

    // Step 2: Fetch agency config (cached or stored in DB)
    const agencyConfig = await fetchAgencyConfig()

    // Step 3: Generate proposal
    const result = await sendProposal({
      projectData,
      clientEmail: formData.clientEmail,
      clientName: formData.clientName,
      agencyConfig,
      proposalLink: `${process.env.NEXT_PUBLIC_SITE_URL}/proposals/${projectId}`,
      includeAttachment: true,
    })

    if (result.success) {
      // Log for audit trail
      await logProposalSend({
        projectId,
        action: 'MANUAL_SEND',
        clientEmail: formData.clientEmail,
        emailId: result.emailId,
      })

      return {
        success: true,
        message: `Proposal sent to ${formData.clientEmail}`,
      }
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[INTEGRATION] Manual proposal error:', message)
    return {
      success: false,
      message,
    }
  }
}

/**
 * Scenario 3: Webhook Handler (e.g., from Zapier)
 * 
 * When a specific event happens (e.g., client sends "send proposal" message),
 * trigger proposal generation and sending via webhook.
 */
export async function handleProposalWebhook(
  webhookData: {
    event: 'AUTO_SEND' | 'REMINDER' | 'REVISION'
    projectId: string
    clientEmail?: string
  }
): Promise<void> {
  try {
    // Fetch project and client data
    const project = await fetchProject(webhookData.projectId)
    if (!project) throw new Error('Project not found')

    // Use webhook email or fall back to project's primary contact
    const clientEmail = webhookData.clientEmail || project.clientEmail
    if (!clientEmail) throw new Error('No client email provided')

    // If revision: increment version, create new proposal
    if (webhookData.event === 'REVISION') {
      const updatedProjectData = {
        ...project.proposalData,
        sections: project.proposalData.sections.map((s: any) => ({
          ...s,
          heading: `${s.heading} (Revised)`,
        })),
      }

      await sendProposal({
        projectData: updatedProjectData,
        clientEmail,
        clientName: project.clientName,
        agencyConfig: await fetchAgencyConfig(),
        proposalLink: `${process.env.NEXT_PUBLIC_SITE_URL}/proposals/${webhookData.projectId}`,
        includeAttachment: true,
      })
    } else {
      // AUTO_SEND or REMINDER
      await sendProposal({
        projectData: project.proposalData,
        clientEmail,
        clientName: project.clientName,
        agencyConfig: await fetchAgencyConfig(),
        proposalLink: `${process.env.NEXT_PUBLIC_SITE_URL}/proposals/${webhookData.projectId}`,
        includeAttachment: true,
      })
    }
  } catch (error) {
    console.error('[WEBHOOK] Proposal send failed:', error)
    throw error
  }
}

/**
 * Helper: Transform KICKOFF report data into ProjectData format
 */
function transformKickoffToProjectData(
  discoveryState: any,
  extractedJson: any
): ProjectData {
  return {
    project_name: discoveryState.projectName || 'Untitled Project',
    subtitle: extractedJson.project_subtitle || undefined,
    estimated_cost: extractedJson.estimated_cost || 'Custom Quote',
    estimated_timeline: extractedJson.estimated_timeline || 'TBD',
    sections: [
      {
        heading: 'Understanding Your Needs',
        text: 'Based on our discovery conversation, we understand your project goals and requirements.',
        bullets: extractedJson.key_goals || ['Project goals will be detailed here'],
      },
      {
        heading: 'Our Approach',
        text: 'We follow a structured process to deliver results that exceed expectations.',
        bullets: extractedJson.methodology_phases || [
          'Discovery & Planning',
          'Design & Prototyping',
          'Development & Testing',
          'Launch & Optimization',
        ],
      },
      {
        heading: 'Deliverables',
        bullets: extractedJson.deliverables || [
          'Comprehensive project documentation',
          'Design mockups and interactive prototypes',
          'Fully functional application',
          'Training and documentation',
        ],
      },
      {
        heading: 'Timeline & Process',
        text: 'We maintain transparent communication throughout the project with regular milestone reviews.',
        bullets: extractedJson.timeline_phases || [
          'Phase 1: Discovery (Weeks 1-2)',
          'Phase 2: Design (Weeks 3-5)',
          'Phase 3: Development (Weeks 6-10)',
          'Phase 4: Testing & Launch (Weeks 11-12)',
        ],
      },
      {
        heading: 'Next Steps',
        text: 'If you are ready to move forward, here is what comes next:',
        bullets: [
          'Project kickoff meeting',
          'Team introduction & process review',
          'Initial discovery deep-dive',
          'Contract signature & payment setup',
        ],
      },
    ],
  }
}

/**
 * Helper: Build AgencyConfig from admin profile
 */
function buildAgencyConfig(agencyDetails: any): AgencyConfig {
  return {
    name: agencyDetails.organizationName || 'Our Agency',
    email: agencyDetails.organizationEmail || 'hello@example.com',
    calendlyLink: agencyDetails.calendlyUrl || 'https://calendly.com',
    primaryColor: agencyDetails.brandColor || '#2d6ef5',
    logo: agencyDetails.logoBase64 || undefined,
  }
}

/**
 * Helper: Store proposal record in database for tracking
 */
async function storeProposalRecord({
  projectId,
  emailId,
  sentTo,
  projectData,
}: {
  projectId: string
  emailId?: string
  sentTo: string
  projectData: ProjectData
}): Promise<void> {
  // This would insert into a proposals table or similar
  console.log(`[STORE] Proposal record: ${projectId} → ${sentTo} (${emailId})`)
  // Example Supabase call:
  // await supabase.from('proposals').insert({
  //   project_id: projectId,
  //   email_id: emailId,
  //   sent_to: sentTo,
  //   project_data: projectData,
  //   sent_at: new Date().toISOString(),
  // })
}

/**
 * Helper: Log proposal actions for audit trail
 */
async function logProposalSend({
  projectId,
  action,
  clientEmail,
  emailId,
}: {
  projectId: string
  action: string
  clientEmail: string
  emailId?: string
}): Promise<void> {
  console.log(`[LOG] ${action}: ${projectId} to ${clientEmail} (${emailId})`)
  // Example Supabase call:
  // await supabase.from('proposal_logs').insert({
  //   project_id: projectId,
  //   action,
  //   client_email: clientEmail,
  //   email_id: emailId,
  //   timestamp: new Date().toISOString(),
  // })
}

/**
 * Helper: Fetch project with proposal data
 */
async function fetchProject(projectId: string): Promise<any> {
  // In a real scenario, fetch from Supabase
  return {
    id: projectId,
    clientName: 'John Doe',
    clientEmail: 'john@company.com',
    proposalData: {
      project_name: 'My Project',
      estimated_cost: '$25,000',
      estimated_timeline: '12 weeks',
      sections: [],
    },
  }
}

/**
 * Helper: Fetch agency config (could be cached)
 */
async function fetchAgencyConfig(): Promise<AgencyConfig> {
  // In a real scenario, fetch from Supabase admin profile
  return {
    name: 'Acme Design Co.',
    email: 'hello@acmedesign.com',
    calendlyLink: 'https://calendly.com/acmedesign',
    primaryColor: '#2d6ef5',
  }
}

/**
 * Example: React Hook for Admin Dashboard
 */
export function useProposalSender() {
  const [isLoading, setIsLoading] = false
  const [error, setError] = ''

  const sendProposalManually = async (formData: any) => {
    setIsLoading(true)
    setError('')

    try {
      const result = await handleManualProposalCreation({
        projectId: formData.projectId,
        formData,
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { sendProposalManually, isLoading, error }
}
