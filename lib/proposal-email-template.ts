import { ProjectData } from './proposal-pdf-generator'

export interface EmailTemplateVariables {
  CLIENT_NAME: string
  PROJECT_NAME: string
  PROPOSAL_LINK: string
  CALENDLY_LINK: string
  AGENCY_NAME: string
  AGENCY_EMAIL: string
  PRIMARY_COLOR: string
  ESTIMATED_COST: string
  ESTIMATED_TIMELINE: string
  KEY_DELIVERABLES: string
}

/**
 * Generate a branded HTML email template for proposal delivery
 * All styling is inline (for Gmail/Outlook/Apple Mail compatibility)
 * Variables are left as {{PLACEHOLDER}} tokens for templating at send time
 */
export function generateProposalEmailHTML(variables: EmailTemplateVariables): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Project Proposal</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .email-content {
        padding: 16px !important;
      }
      .stat-card-row {
        display: block !important;
      }
      .stat-card {
        width: 100% !important;
        margin-bottom: 16px !important;
        margin-right: 0 !important;
      }
      .footer-content {
        display: block !important;
        text-align: center !important;
      }
      .footer-links {
        margin-bottom: 16px !important;
      }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
  <!-- WRAPPER -->
  <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- HEADER -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${variables.PRIMARY_COLOR}; padding: 24px; box-sizing: border-box;">
      <tr>
        <td align="center">
          <!-- Logo placeholder -->
          <div style="margin-bottom: 12px;">
            <strong style="font-size: 18px; color: #ffffff; letter-spacing: 1px;">ProjectPilot</strong>
          </div>
          <p style="margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.9); letter-spacing: 0.5px;">From idea to kickoff, instantly</p>
        </td>
      </tr>
    </table>

    <!-- CONTENT -->
    <div class="email-content" style="padding: 32px 24px;">
      <!-- GREETING -->
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #1a2340; font-weight: 600;">
        Hi {{CLIENT_NAME}},
      </p>

      <!-- INTRO PARAGRAPH -->
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        Thank you for our great conversation about <strong>{{PROJECT_NAME}}</strong>. 
        Based on our discovery session, we've put together a comprehensive proposal that outlines the scope, 
        timeline, and investment for your project. Please see the attached PDF for full details.
      </p>

      <!-- STAT CARDS -->
      <div class="stat-card-row" style="display: flex; gap: 16px; margin: 32px 0;">
        <!-- Card 1: Timeline -->
        <div class="stat-card" style="width: 32%; background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; box-sizing: border-box;">
          <div style="font-size: 24px; margin-bottom: 8px;">⏱️</div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Timeline</p>
          <p style="margin: 0; font-size: 16px; color: #1a2340; font-weight: bold;">{{ESTIMATED_TIMELINE}}</p>
        </div>

        <!-- Card 2: Budget -->
        <div class="stat-card" style="width: 32%; background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; box-sizing: border-box;">
          <div style="font-size: 24px; margin-bottom: 8px;">💰</div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Budget</p>
          <p style="margin: 0; font-size: 16px; color: #1a2340; font-weight: bold;">{{ESTIMATED_COST}}</p>
        </div>

        <!-- Card 3: Deliverables -->
        <div class="stat-card" style="width: 32%; background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; box-sizing: border-box;">
          <div style="font-size: 24px; margin-bottom: 8px;">📦</div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Deliverables</p>
          <p style="margin: 0; font-size: 16px; color: #1a2340; font-weight: bold;">{{KEY_DELIVERABLES}}</p>
        </div>
      </div>

      <!-- CTA BUTTON -->
      <div style="margin: 32px 0; text-align: center;">
        <a href="{{PROPOSAL_LINK}}" style="display: inline-block; padding: 14px 32px; background-color: ${variables.PRIMARY_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; transition: opacity 0.2s;">
          View Full Proposal
        </a>
      </div>

      <!-- SECONDARY CTA -->
      <p style="margin: 24px 0; font-size: 13px; line-height: 1.6; color: #64748b; text-align: center;">
        Have questions? <a href="{{CALENDLY_LINK}}" style="color: ${variables.PRIMARY_COLOR}; text-decoration: none; font-weight: 600;">Book a quick call</a> or <a href="mailto:{{AGENCY_EMAIL}}" style="color: ${variables.PRIMARY_COLOR}; text-decoration: none; font-weight: 600;">reply to this email</a>.
      </p>
    </div>

    <!-- FOOTER -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px;">
      <tr>
        <td>
          <div class="footer-content" style="display: flex; justify-content: space-between; align-items: center;">
            <div class="footer-links" style="flex: 1;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
                {{AGENCY_NAME}}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                {{AGENCY_EMAIL}}
              </p>
              <div style="margin-top: 12px; display: flex; gap: 12px; justify-content: flex-start;">
                <!-- Social icons (placeholder) -->
                <a href="#" style="color: #94a3b8; text-decoration: none; font-size: 12px;">LinkedIn</a>
                <a href="#" style="color: #94a3b8; text-decoration: none; font-size: 12px;">Twitter</a>
              </div>
            </div>
            <div style="text-align: right; flex: 1;">
              <p style="margin: 0; font-size: 10px; color: #cbd5e1; text-align: right;">
                Powered by <strong>ProjectPilot</strong>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
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
