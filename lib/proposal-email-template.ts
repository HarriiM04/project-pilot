import { ProjectData } from './proposal-pdf-generator'

export interface EmailTemplateVariables {
  CLIENT_NAME: string
  PROJECT_NAME: string
  PROPOSAL_LINK: string
  WHATSAPP_LINK: string
  AGENCY_NAME: string
  AGENCY_EMAIL: string
  PRIMARY_COLOR: string
  ESTIMATED_COST: string
  ESTIMATED_TIMELINE: string
  KEY_DELIVERABLES: string
}

/**
 * Generate a branded HTML email template for proposal delivery.
 * Uses table-based layout for maximum email client compatibility
 * (Gmail, Outlook, Apple Mail, etc.)
 *
 * CTAs:
 *  - "View Full Proposal (PDF)" → PROPOSAL_LINK
 *  - "Book Kickoff Call" → WHATSAPP_LINK (wa.me with prefilled message)
 */
export function generateProposalEmailHTML(variables: EmailTemplateVariables): string {
  const primary = variables.PRIMARY_COLOR || '#4F46E5'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Project Proposal</title>
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .stack { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .h1 { font-size: 22px !important; }
    .cta-cell { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F4F5F7; font-family:Helvetica, Arial, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F5F7; padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FFFFFF; border-radius:12px; overflow:hidden; border:1px solid #E5E7EB;">

        <!-- Header -->
        <tr>
          <td class="px" style="background-color:${primary}; padding:28px 40px;" align="left">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle" width="36">
                  <div style="width:36px; height:36px; background-color:#FFFFFF; border-radius:8px; text-align:center; line-height:36px; font-weight:bold; color:${primary}; font-family:Helvetica, Arial, sans-serif;">PP</div>
                </td>
                <td valign="middle" style="padding-left:12px;">
                  <span style="font-size:18px; font-weight:bold; color:#FFFFFF; font-family:Helvetica, Arial, sans-serif;">ProjectPilot</span><br>
                  <span style="font-size:12px; color:#E9E9FF; font-family:Helvetica, Arial, sans-serif;">From idea to kickoff, instantly</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="px" style="padding:36px 40px 8px 40px;">
            <p class="h1" style="margin:0 0 16px 0; font-size:20px; font-weight:bold; color:#111827; font-family:Helvetica, Arial, sans-serif;">
              Hi {{CLIENT_NAME}},
            </p>
            <p style="margin:0 0 20px 0; font-size:15px; line-height:22px; color:#4B5563; font-family:Helvetica, Arial, sans-serif;">
              Based on our recent discovery conversation, we&rsquo;ve put together the full project proposal for
              <strong style="color:#111827;">{{PROJECT_NAME}}</strong>. It covers scope, timeline, cost estimate,
              and key deliverables &mdash; attached as a PDF below.
            </p>
          </td>
        </tr>

        <!-- Stat cards -->
        <tr>
          <td class="px" style="padding:0 40px 8px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="stack" width="33.33%" style="padding-right:8px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px;">
                    <tr>
                      <td align="center" style="padding:18px 8px;">
                        <div style="font-size:20px; margin-bottom:6px;">&#9201;&#65039;</div>
                        <div style="font-size:11px; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px; font-family:Helvetica, Arial, sans-serif;">Timeline</div>
                        <div style="font-size:15px; font-weight:bold; color:#111827; margin-top:2px; font-family:Helvetica, Arial, sans-serif;">{{ESTIMATED_TIMELINE}}</div>
                      </td>
                    </tr>
                  </table>
                </td>
                <td class="stack" width="33.33%" style="padding-left:4px; padding-right:4px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px;">
                    <tr>
                      <td align="center" style="padding:18px 8px;">
                        <div style="font-size:20px; margin-bottom:6px;">&#128176;</div>
                        <div style="font-size:11px; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px; font-family:Helvetica, Arial, sans-serif;">Budget Range</div>
                        <div style="font-size:15px; font-weight:bold; color:#111827; margin-top:2px; font-family:Helvetica, Arial, sans-serif;">{{ESTIMATED_COST}}</div>
                      </td>
                    </tr>
                  </table>
                </td>
                <td class="stack" width="33.33%" style="padding-left:8px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px;">
                    <tr>
                      <td align="center" style="padding:18px 8px;">
                        <div style="font-size:20px; margin-bottom:6px;">&#128230;</div>
                        <div style="font-size:11px; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px; font-family:Helvetica, Arial, sans-serif;">Deliverables</div>
                        <div style="font-size:15px; font-weight:bold; color:#111827; margin-top:2px; font-family:Helvetica, Arial, sans-serif;">{{KEY_DELIVERABLES}}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Two CTA buttons side by side -->
        <tr>
          <td align="center" style="padding:28px 40px 8px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- CTA 1: View Proposal PDF -->
                <td class="cta-cell" align="center" style="padding-right:8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:8px; background-color:${primary};">
                        <a href="{{PROPOSAL_LINK}}" style="display:inline-block; padding:13px 24px; font-size:14px; font-weight:bold; color:#FFFFFF; text-decoration:none; font-family:Helvetica, Arial, sans-serif; white-space:nowrap;">
                          &#128196; View Full Proposal (PDF)
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
                <!-- CTA 2: Book Kickoff Call via WhatsApp -->
                <td class="cta-cell" align="center" style="padding-left:8px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:8px; background-color:#25D366;">
                        <a href="{{WHATSAPP_LINK}}" style="display:inline-block; padding:13px 24px; font-size:14px; font-weight:bold; color:#FFFFFF; text-decoration:none; font-family:Helvetica, Arial, sans-serif; white-space:nowrap;">
                          &#128222; Book Kickoff Call
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Secondary line -->
        <tr>
          <td class="px" align="center" style="padding:12px 40px 32px 40px;">
            <p style="margin:0; font-size:13px; color:#6B7280; font-family:Helvetica, Arial, sans-serif;">
              We&rsquo;ll follow up within 2 business days to schedule a kickoff call. Or just reply to this email, or
              <a href="{{WHATSAPP_LINK}}" style="color:${primary}; text-decoration:underline;">message us on WhatsApp</a>.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <div style="border-top:1px solid #E5E7EB;"></div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="px" align="center" style="padding:24px 40px 32px 40px;">
            <p style="margin:0 0 6px 0; font-size:13px; font-weight:bold; color:#111827; font-family:Helvetica, Arial, sans-serif;">{{AGENCY_NAME}}</p>
            <p style="margin:0 0 12px 0; font-size:12px; color:#6B7280; font-family:Helvetica, Arial, sans-serif;">{{AGENCY_EMAIL}}</p>
            <p style="margin:16px 0 0 0; font-size:11px; color:#9CA3AF; font-family:Helvetica, Arial, sans-serif;">
              &#9889; Powered by ProjectPilot
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

/**
 * Replace template placeholders with actual values
 */
export function renderEmailTemplate(template: string, variables: EmailTemplateVariables): string {
  let html = template

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g')
    html = html.replace(placeholder, value)
  }

  return html
}
