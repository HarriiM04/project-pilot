import { Resend } from 'resend'
import {
  generateProposalPDF,
  type ProjectData,
} from './proposal-pdf-generator'
import {
  generateProposalEmailHTML,
  renderEmailTemplate,
  type EmailTemplateVariables,
} from './proposal-email-template'

export interface AgencyConfig {
  name: string
  email: string
  calendlyLink: string
  primaryColor: string
  logo?: string
}

export interface SendProposalInput {
  projectData: ProjectData
  clientEmail: string
  clientName: string
  agencyConfig: AgencyConfig
  proposalLink: string
  includeAttachment?: boolean
}

export interface SendProposalResult {
  success: boolean
  message: string
  emailId?: string
  error?: string
}

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Complete workflow: Generate PDF, render email template, and send via Resend
 * @param input - All required data for proposal generation and sending
 * @returns Success/failure status with optional email ID
 */
export async function sendProposal(input: SendProposalInput): Promise<SendProposalResult> {
  try {
    // Validate inputs
    if (!input.projectData.project_name || !input.clientEmail || !input.clientName) {
      return {
        success: false,
        message: 'Missing required fields: project_name, clientEmail, or clientName',
        error: 'INVALID_INPUT',
      }
    }

    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        message: 'RESEND_API_KEY not configured',
        error: 'CONFIG_ERROR',
      }
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      return {
        success: false,
        message: 'RESEND_FROM_EMAIL not configured',
        error: 'CONFIG_ERROR',
      }
    }

    console.log(`[PROPOSAL] Generating PDF for project: ${input.projectData.project_name}`)

    // Step 1: Generate PDF
    const pdfBuffer = generateProposalPDF(input.projectData)
    const pdfBase64 = pdfBuffer.toString('base64')

    console.log(`[PROPOSAL] PDF generated: ${pdfBuffer.length} bytes`)

    // Step 2: Generate email template
    const emailTemplate = generateProposalEmailHTML({
      CLIENT_NAME: input.clientName,
      PROJECT_NAME: input.projectData.project_name,
      PROPOSAL_LINK: input.proposalLink,
      CALENDLY_LINK: input.agencyConfig.calendlyLink,
      AGENCY_NAME: input.agencyConfig.name,
      AGENCY_EMAIL: input.agencyConfig.email,
      PRIMARY_COLOR: input.agencyConfig.primaryColor,
      ESTIMATED_COST: input.projectData.estimated_cost,
      ESTIMATED_TIMELINE: input.projectData.estimated_timeline,
      KEY_DELIVERABLES: `${input.projectData.sections.length} phases`,
    })

    const emailHTML = renderEmailTemplate(emailTemplate, {
      CLIENT_NAME: input.clientName,
      PROJECT_NAME: input.projectData.project_name,
      PROPOSAL_LINK: input.proposalLink,
      CALENDLY_LINK: input.agencyConfig.calendlyLink,
      AGENCY_NAME: input.agencyConfig.name,
      AGENCY_EMAIL: input.agencyConfig.email,
      PRIMARY_COLOR: input.agencyConfig.primaryColor,
      ESTIMATED_COST: input.projectData.estimated_cost,
      ESTIMATED_TIMELINE: input.projectData.estimated_timeline,
      KEY_DELIVERABLES: `${input.projectData.sections.length} phases`,
    })

    console.log(`[PROPOSAL] Email template rendered`)

    // Step 3: Send email via Resend
    const senderEmail = process.env.RESEND_FROM_EMAIL
    const attachments = input.includeAttachment !== false
      ? [{
          filename: `proposal-${input.projectData.project_name.replace(/\s+/g, '-')}.pdf`,
          content: pdfBase64,
        }]
      : undefined

    console.log(`[PROPOSAL] Sending email to ${input.clientEmail}...`)

    const { data, error: resendError } = await resend.emails.send({
      from: `${input.agencyConfig.name} <${senderEmail}>`,
      to: [input.clientEmail],
      subject: `Your Project Proposal: ${input.projectData.project_name}`,
      html: emailHTML,
      attachments,
    })

    if (resendError) {
      console.error(`[PROPOSAL] Resend error:`, resendError)
      return {
        success: false,
        message: `Failed to send email: ${resendError.message}`,
        error: 'SEND_FAILED',
      }
    }

    console.log(`[PROPOSAL] Email sent successfully (ID: ${data?.id})`)

    return {
      success: true,
      message: `Proposal successfully sent to ${input.clientEmail}`,
      emailId: data?.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[PROPOSAL] Server error:`, errorMessage)
    return {
      success: false,
      message: `Server error: ${errorMessage}`,
      error: 'SERVER_ERROR',
    }
  }
}

/**
 * Convenience function to generate PDF only (for testing or manual download)
 */
export async function generateProposalPDFOnly(projectData: ProjectData): Promise<Buffer> {
  return generateProposalPDF(projectData)
}

/**
 * Convenience function to render email only (for testing/preview)
 */
export async function renderProposalEmailOnly(
  projectData: ProjectData,
  clientName: string,
  agencyConfig: AgencyConfig,
  proposalLink: string
): Promise<string> {
  const template = generateProposalEmailHTML({
    CLIENT_NAME: clientName,
    PROJECT_NAME: projectData.project_name,
    PROPOSAL_LINK: proposalLink,
    CALENDLY_LINK: agencyConfig.calendlyLink,
    AGENCY_NAME: agencyConfig.name,
    AGENCY_EMAIL: agencyConfig.email,
    PRIMARY_COLOR: agencyConfig.primaryColor,
    ESTIMATED_COST: projectData.estimated_cost,
    ESTIMATED_TIMELINE: projectData.estimated_timeline,
    KEY_DELIVERABLES: `${projectData.sections.length} phases`,
  })

  return renderEmailTemplate(template, {
    CLIENT_NAME: clientName,
    PROJECT_NAME: projectData.project_name,
    PROPOSAL_LINK: proposalLink,
    CALENDLY_LINK: agencyConfig.calendlyLink,
    AGENCY_NAME: agencyConfig.name,
    AGENCY_EMAIL: agencyConfig.email,
    PRIMARY_COLOR: agencyConfig.primaryColor,
    ESTIMATED_COST: projectData.estimated_cost,
    ESTIMATED_TIMELINE: projectData.estimated_timeline,
    KEY_DELIVERABLES: `${projectData.sections.length} phases`,
  })
}
