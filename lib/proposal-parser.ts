/**
 * Proposal Parser & Validator
 * 
 * Extracts structured data from AI-generated proposal markdown,
 * validates cost/timeline formatting, and filters internal notes
 */

export interface ParsedProposal {
  sections: ProposalSection[]
  metadata: {
    projectTitle: string
    estimatedCost: string | null
    estimatedTimeline: string | null
    hasPlaceholders: boolean
  }
  warnings: string[]
}

export interface ProposalSection {
  heading: string
  content: string
  isClientFacing: boolean
  isPlaceholder: boolean
}

/**
 * Validate final cost input from user
 * Bug fix #1: Prevent string concatenation/multiplication issues
 */
export function validateAndFormatCost(input: string): string {
  // Remove all non-numeric characters except dash/hyphen for ranges
  const cleaned = input.replace(/[^\d\-–]/g, '')
  
  // Check for range (e.g., "15000-20000")
  if (cleaned.includes('-') || cleaned.includes('–')) {
    const parts = cleaned.split(/[-–]/).map(p => p.trim()).filter(Boolean)
    if (parts.length === 2) {
      const low = parseInt(parts[0])
      const high = parseInt(parts[1])
      
      if (isNaN(low) || isNaN(high)) {
        throw new Error('Invalid cost range: values must be numeric')
      }
      
      if (low >= high) {
        throw new Error('Invalid cost range: lower bound must be less than upper bound')
      }
      
      // Validate realistic range
      if (high > 10_000_000) {
        throw new Error(`Cost validation failed: ${high.toLocaleString()} exceeds realistic range ($10M max)`)
      }
      
      if (low < 100) {
        throw new Error(`Cost validation failed: ${low} is unrealistically low (minimum $100)`)
      }
      
      return `$${low.toLocaleString('en-US')} - $${high.toLocaleString('en-US')}`
    }
  }
  
  // Single value
  const value = parseInt(cleaned)
  
  if (isNaN(value)) {
    throw new Error('Invalid cost: must be a numeric value')
  }
  
  // Validate realistic range
  if (value > 10_000_000) {
    throw new Error(`Cost validation failed: $${value.toLocaleString()} exceeds realistic range ($10M max)`)
  }
  
  if (value < 100) {
    throw new Error(`Cost validation failed: $${value} is unrealistically low (minimum $100)`)
  }
  
  return `$${value.toLocaleString('en-US')}`
}

/**
 * Validate timeline input from user
 * Bug fix #2: Ensure unit is always included
 */
export function validateAndFormatTimeline(input: string): string {
  // Extract number and unit
  const match = input.match(/(\d+[-–]?\d*)\s*(weeks?|months?|days?)?/i)
  
  if (!match) {
    throw new Error('Invalid timeline: must include a numeric value (e.g., "8-10 weeks")')
  }
  
  const value = match[1]
  let unit = match[2]
  
  // Bug fix: If no unit provided, throw error (don't assume)
  if (!unit) {
    throw new Error('Invalid timeline: must include a unit (e.g., "weeks", "months")')
  }
  
  // Normalize unit to plural
  unit = unit.toLowerCase()
  if (!unit.endsWith('s')) {
    unit = `${unit}s`
  }
  
  // Validate range format
  if (value.includes('-') || value.includes('–')) {
    const parts = value.split(/[-–]/)
    const low = parseInt(parts[0])
    const high = parseInt(parts[1])
    
    if (isNaN(low) || isNaN(high)) {
      throw new Error('Invalid timeline range: values must be numeric')
    }
    
    if (low >= high) {
      throw new Error('Invalid timeline range: lower bound must be less than upper bound')
    }
  }
  
  return `${value} ${unit}`
}

/**
 * Sanitize "Next Steps" section
 * Bug fix #3: Replace internal notes with client-facing content
 */
export function sanitizeNextStepsSection(content: string): string {
  // Internal-only phrases that should NOT appear in client proposals
  const internalPhrases = [
    /agency will review/i,
    /agency will prepare/i,
    /internal note/i,
    /internal use only/i,
    /system placeholder/i,
    /pm will/i,
    /team will review/i,
    /pending approval/i,
    /to be discussed internally/i,
    /prepare proposal/i,
  ]
  
  // Check if content has internal notes
  const hasInternalNote = internalPhrases.some(phrase => phrase.test(content))
  
  if (hasInternalNote) {
    // Replace with client-facing next steps
    return `We're excited to move forward with this project! Here's what happens next:

- **We'll follow up within 2 business days** to schedule a kickoff call
- During the call, we'll review the proposal in detail and answer any questions
- Once approved, we'll finalize the contract and begin the discovery phase

Please feel free to reply to this email or schedule a call directly using the link provided. We look forward to bringing your vision to life!`
  }
  
  return content
}

/**
 * Validate email template has all required placeholders filled
 * Bug fix #4: Prevent sending emails with missing data
 */
export function validateEmailTemplate(html: string): { valid: boolean; missing: string[] } {
  const requiredPlaceholders = [
    'CLIENT_NAME',
    'PROJECT_NAME',
    'ESTIMATED_TIMELINE',
    'ESTIMATED_COST',
    'PROPOSAL_LINK',
    'WHATSAPP_LINK',
  ]
  
  const missing: string[] = []
  
  for (const placeholder of requiredPlaceholders) {
    const pattern = new RegExp(`{{${placeholder}}}`, 'g')
    if (pattern.test(html)) {
      missing.push(placeholder)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  }
}
