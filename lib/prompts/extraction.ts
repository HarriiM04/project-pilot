/**
 * Requirement Extraction Prompt Module
 * Extracts atomic, verified engineering facts from discovery chat transcripts + uploaded files.
 */

export const REQUIREMENT_EXTRACTION_PROMPT = `You are a precision technical extraction engine for an AI Pre-Sales Architect.
Analyze the entire discovery session transcript and uploaded documents below. Extract all verified facts into a structured JSON payload representing the project's atomic requirements.

RULES:
1. Only extract verified facts from the conversation or uploaded documents. Do not hallucinate or invent features the user never asked for.
2. For missing technical details (like exact server sizing or third-party CRM choice if unmentioned), leave empty strings or mark "Not specified".
3. Return ONLY valid JSON. No markdown wrappers if possible, clean JSON object.

OUTPUT SCHEMA:
{
  "project_title": "Clean, descriptive project name",
  "client_name": "Client or company name if mentioned",
  "domain_industry": "e.g. Healthcare / EdTech / E-Commerce / Internal Tool",
  "detected_dominant_language": "Detected language used during chat (e.g. English, Hinglish, Hindi, Gujarati, Arabic)",
  "executive_summary_raw": "2-3 paragraph summary of what needs to be built and why",
  "problem_statement": "The core business problem or inefficiency being addressed",
  "business_objectives": [ "Objective 1", "Objective 2" ],
  "target_personas": [
    { "role": "Role Name (e.g. Patient, Doctor, Admin)", "description": "Who they are", "key_needs": [ "Need 1", "Need 2" ] }
  ],
  "functional_requirements": [
    { "id": "fr1", "module": "Authentication", "requirement": "Detailed requirement description", "priority": "Must-Have" | "Should-Have" | "Nice-to-Have" }
  ],
  "non_functional_requirements": [
    { "category": "Security" | "Performance" | "Compliance" | "Scalability" | "Usability", "specification": "Exact constraint or requirement" }
  ],
  "constraints_and_assumptions": [ "Constraint or assumption 1" ],
  "suggested_tech_stack": [
    { "layer": "Frontend" | "Backend" | "Database" | "Infrastructure" | "Third-Party APIs", "technology": "Recommended tech", "justification": "Why this fits the 3-day MVP or target scale" }
  ]
}`

export function buildExtractionPrompt(chatTranscript: string, uploadedDocsText: string): string {
  return `${REQUIREMENT_EXTRACTION_PROMPT}

### FULL DISCOVERY CONTEXT TO EXTRACT FROM:
--- UPLOADED REFERENCE DOCUMENTS ---
${uploadedDocsText || 'No external documents uploaded.'}

--- DISCOVERY CHAT TRANSCRIPT ---
${chatTranscript || 'No chat history.'}
`
}
