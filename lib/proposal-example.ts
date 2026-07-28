/**
 * Example usage of the Proposal PDF Generator & Email System
 * This file demonstrates how to use the modular proposal generation system
 */

import type { ProjectData, AgencyConfig, SendProposalInput } from '@/lib/send-proposal'

/**
 * Example 1: E-Commerce Platform Proposal
 */
export const EXAMPLE_ECOMMERCE_PROJECT: ProjectData = {
  project_name: 'E-Commerce Platform Redesign',
  subtitle: 'Mobile-first, high-performance shopping experience',
  estimated_cost: '$45,000 - $60,000',
  estimated_timeline: '14-16 weeks',
  sections: [
    {
      heading: 'Discovery & Strategy',
      text: 'We start by understanding your business goals, user needs, and competitive landscape. This phase includes stakeholder interviews, user research, and a comprehensive competitive analysis.',
      bullets: [
        'Stakeholder interviews & goal alignment',
        'User research & persona development',
        'Competitive landscape analysis',
        'Information architecture audit',
        'Requirements documentation',
      ],
    },
    {
      heading: 'Design Phase',
      text: 'Our design team creates wireframes, prototypes, and high-fidelity mockups following your brand guidelines and accessibility standards.',
      bullets: [
        { label: 'Wireframing', text: 'Low-fidelity layouts for all key user flows' },
        { label: 'Interactive Prototypes', text: 'Clickable prototypes for stakeholder feedback' },
        { label: 'Visual Design', text: 'High-fidelity mockups with complete design system' },
        { label: 'Accessibility Audit', text: 'WCAG 2.1 AA compliance review' },
      ],
    },
    {
      heading: 'Development & Integration',
      text: 'We build a scalable, performant platform with modern technologies and best practices.',
      bullets: [
        {
          label: 'Frontend',
          text: 'React with TypeScript, responsive design, optimized performance',
        },
        {
          label: 'Backend',
          text: 'Node.js API with PostgreSQL, real-time inventory management',
        },
        {
          label: 'Payment Integration',
          text: 'Stripe or PayPal integration with PCI compliance',
        },
        {
          label: 'Email & Marketing',
          text: 'Automated order confirmations, marketing automation hooks',
        },
      ],
    },
    {
      heading: 'Testing & Launch',
      text: 'Comprehensive testing across devices and browsers, followed by a phased launch strategy.',
      bullets: [
        'Functional testing across all user flows',
        'Performance optimization (Lighthouse score >90)',
        'Security penetration testing',
        'Staging environment migration',
        'Staged production rollout with monitoring',
      ],
    },
    {
      heading: 'Post-Launch Support',
      text: 'We provide ongoing support, monitoring, and optimization.',
      bullets: [
        '30 days of post-launch support included',
        'Analytics setup & reporting',
        'Performance monitoring & optimization',
        'Bug fixes & minor enhancements',
      ],
    },
  ],
}

/**
 * Example 2: Mobile App Proposal
 */
export const EXAMPLE_MOBILE_APP: ProjectData = {
  project_name: 'Fitness Tracking Mobile App',
  subtitle: 'iOS & Android native apps with wearable integration',
  estimated_cost: '$80,000 - $120,000',
  estimated_timeline: '20-24 weeks',
  sections: [
    {
      heading: 'Requirements & Technical Specification',
      text: 'Define app features, user flows, and technical architecture.',
      bullets: [
        'User authentication & profile management',
        'Wearable device integration (Apple Watch, Fitbit)',
        'Real-time data sync with cloud backend',
        'Social features (friend tracking, challenges)',
      ],
    },
    {
      heading: 'iOS Development',
      bullets: [
        { label: 'Native Swift', text: 'High-performance, native iOS experience' },
        { label: 'HealthKit Integration', text: 'Seamless Apple Health data sync' },
        { label: 'Push Notifications', text: 'Motivation & engagement notifications' },
        { label: 'App Store Submission', text: 'Full compliance & marketing support' },
      ],
    },
    {
      heading: 'Android Development',
      bullets: [
        { label: 'Kotlin/Java', text: 'Modern Android architecture' },
        { label: 'Google Fit API', text: 'Seamless Google Health data sync' },
        { label: 'Background Services', text: 'Efficient data collection & syncing' },
        { label: 'Play Store Submission', text: 'Full compliance & marketing support' },
      ],
    },
    {
      heading: 'Backend & Cloud Infrastructure',
      bullets: [
        { label: 'API Server', text: 'Node.js/Express with PostgreSQL' },
        { label: 'Real-time Sync', text: 'WebSockets for live updates' },
        { label: 'Cloud Hosting', text: 'AWS/GCP with auto-scaling' },
        { label: 'Analytics', text: 'User behavior tracking & reporting' },
      ],
    },
  ],
}

/**
 * Example Agency Configuration
 */
export const EXAMPLE_AGENCY_CONFIG: AgencyConfig = {
  name: 'Acme Design Co.',
  email: 'hello@acmedesign.com',
  calendlyLink: 'https://calendly.com/acmedesign/discovery',
  primaryColor: '#2d6ef5',
}

/**
 * Example 3: Send Complete Proposal
 */
export async function exampleSendProposal() {
  const { sendProposal } = await import('@/lib/send-proposal')

  const result = await sendProposal({
    projectData: EXAMPLE_ECOMMERCE_PROJECT,
    clientEmail: 'john.doe@retailcompany.com',
    clientName: 'John Doe',
    agencyConfig: EXAMPLE_AGENCY_CONFIG,
    proposalLink: 'https://app.acmedesign.com/proposals/proj-abc123',
    includeAttachment: true,
  })

  return result
}

/**
 * Example 4: Generate PDF only
 */
export async function exampleGeneratePDFOnly() {
  const { generateProposalPDFOnly } = await import('@/lib/send-proposal')

  const pdfBuffer = await generateProposalPDFOnly(EXAMPLE_ECOMMERCE_PROJECT)

  // In a real API route:
  // res.setHeader('Content-Type', 'application/pdf')
  // res.setHeader('Content-Disposition', 'attachment; filename="proposal.pdf"')
  // res.send(pdfBuffer)

  return pdfBuffer
}

/**
 * Example 5: Render email only (for preview/testing)
 */
export async function exampleRenderEmailOnly() {
  const { renderProposalEmailOnly } = await import('@/lib/send-proposal')

  const htmlEmail = await renderProposalEmailOnly(
    EXAMPLE_MOBILE_APP,
    'Sarah Johnson',
    EXAMPLE_AGENCY_CONFIG,
    'https://app.acmedesign.com/proposals/proj-mobile-123'
  )

  // In a real scenario, you'd:
  // - Open this in a browser to preview
  // - Send to email preview service
  // - Store in a database for auditing

  return htmlEmail
}

/**
 * Example 6: Custom proposal with dynamic data
 */
export function createCustomProposal(
  projectName: string,
  estimatedCost: string,
  estimatedTimeline: string,
  deliverables: string[]
): ProjectData {
  return {
    project_name: projectName,
    estimated_cost: estimatedCost,
    estimated_timeline: estimatedTimeline,
    sections: [
      {
        heading: 'Project Overview',
        text: `We're excited to help you with ${projectName}. Our approach combines strategic thinking with practical execution to deliver results that exceed your expectations.`,
        bullets: [
          'Discovery & requirements gathering',
          'Design & prototyping',
          'Implementation & testing',
          'Launch & ongoing support',
        ],
      },
      {
        heading: 'Deliverables',
        bullets: deliverables,
      },
      {
        heading: 'Timeline & Milestones',
        text: `This project is estimated to take ${estimatedTimeline}, with regular check-ins and transparent communication throughout.`,
        bullets: [
          'Week 1-2: Discovery & planning',
          'Week 3-6: Design phase',
          'Week 7-10: Development & testing',
          'Week 11+: Launch & optimization',
        ],
      },
      {
        heading: 'Investment',
        text: `The estimated investment for this project is ${estimatedCost}. This includes all design, development, testing, and launch support.`,
        bullets: [
          '50% upon project kickoff',
          '50% upon successful launch',
          'Flexible payment terms available',
        ],
      },
    ],
  }
}

/**
 * Type-safe helper to create send proposal input
 */
export function createSendProposalInput(
  projectData: ProjectData,
  clientEmail: string,
  clientName: string,
  proposalLink: string,
  agencyConfig: AgencyConfig = EXAMPLE_AGENCY_CONFIG
): SendProposalInput {
  return {
    projectData,
    clientEmail,
    clientName,
    agencyConfig,
    proposalLink,
    includeAttachment: true,
  }
}
