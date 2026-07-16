export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  options?: string[]
}

export type FeaturePriority = 'must-have' | 'should-have' | 'nice-to-have'
export type FeatureStatus = 'captured' | 'clarifying' | 'proposed'

export interface FeatureItem {
  id: string
  name: string
  description: string
  priority: FeaturePriority
  effort: 'S' | 'M' | 'L' | 'XL'
  status: FeatureStatus
}

export interface DiscoverySection {
  key: string
  label: string
  completion: number
}

export interface UserStory {
  id: string
  persona: string
  want: string
  soThat: string
  points: number
}

export interface RequirementRow {
  id: string
  code: string
  requirement: string
  category: string
}

export interface DiscoveryState {
  projectName: string
  clientName: string
  domain: string
  overallCompletion: number
  sections: DiscoverySection[]
  features: FeatureItem[]
  brd: { objectives: string[]; scope: string[]; stakeholders: string[] }
  prd: { personas: string[]; goals: string[]; metrics: string[] }
  srs: {
    functional: RequirementRow[]
    nonFunctional: RequirementRow[]
  }
  userStories: UserStory[]
  architecture: {
    layers: { name: string; tech: string; note: string }[]
    integrations: string[]
  }
  suggestedOptions?: string[]
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
}

export interface KickoffReport {
  id?: string
  project_id: string
  report_markdown: string
  extracted_json: Record<string, unknown>
  created_at?: string
  updated_at?: string
}
