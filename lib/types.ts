export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  options?: string[]
}

export interface DiscoverySection {
  key: string
  label: string
  completion: number
}

export interface DiscoveryState {
  projectName: string
  clientName: string
  domain: string
  overallCompletion: number
  sections: DiscoverySection[]
  suggestedOptions?: string[]
  requirementsChanged?: boolean
}

// ── 3-Day MVP Core Types ──────────────────────────────────────────────────

export interface UploadedDoc {
  filename: string
  storage_path: string
  extracted_text_snippet: string
  uploaded_at: number
}

export interface PillarStatus {
  business_goals: 'missing' | 'partial' | 'clear'
  target_users: 'missing' | 'partial' | 'clear'
  functional_scope: 'missing' | 'partial' | 'clear'
  non_functional_reqs: 'missing' | 'partial' | 'clear'
  constraints: 'missing' | 'partial' | 'clear'
}

export interface DiscoveryTurnResponse {
  completeness_score: number
  pillar_status: PillarStatus
  suggested_quick_replies: string[]
  assistant_reply: string
  dominant_language?: string
  industry_domain?: string
  requirements_changed?: boolean
}

export interface KickoffReport {
  id?: string
  project_id: string
  report_markdown: string
  extracted_json: Record<string, unknown>
  created_at?: string
  updated_at?: string
}
