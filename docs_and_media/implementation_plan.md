# ProjectPilot: Backend & AI Orchestration Layer

## Overview

ProjectPilot is a Next.js 16 (App Router) application that acts as an AI pre-sales engineer. The UI already exists — built with v0 — with a mock streaming `/api/chat` endpoint, a `DiscoveryProvider` managing state, and a `DocumentViewer` rendering BRD/PRD/SRS tabs from in-memory data.

This plan replaces the mocks with a real Gemini 1.5 Pro AI backend and Supabase persistence layer.

---

## User Review Required

> [!IMPORTANT]
> **API Key Security**: Your Google API Key and Supabase keys are being stored in `.env.local` (git-ignored). Make sure `.gitignore` already excludes `.env.local`. The keys you provided will be written directly into that file.

> [!WARNING]
> **Stream Protocol Change**: The current `discovery-store.tsx` reads the response stream as raw text. The new implementation uses a **newline-delimited dual-channel protocol** where the stream carries the conversational text tokens, and a final JSON sentinel `__DISCOVERY_STATE__:{...}` is appended at the end so the frontend can parse the updated `discovery_state` without breaking the streaming UX.

> [!IMPORTANT]
> **Supabase Password**: The connection string you provided contains `[YOUR-PASSWORD]` as a placeholder. The SQL schema file is for running manually in the Supabase SQL Editor — no password is needed for that. The `@supabase/supabase-js` client uses the anon key (already provided), not a direct DB password.

> [!CAUTION]
> **No Authentication**: This plan uses a **hardcoded `project_id`** (`'demo-project-1'`) for the Supabase row, since there is no auth layer in the current codebase. Every user shares the same project state. Adding real auth is out of scope per your request.

---

## Open Questions

> [!NOTE]
> **Gemini SDK**: The latest Google GenAI SDK package is `@google/genai` (not the older `@google-cloud/vertexai`). This plan uses `@google/genai` which supports `gemini-1.5-pro` with streaming and structured output. Confirm you are okay with this.

> [!NOTE]
> **Discovery State Merge Strategy**: When Gemini returns a partial `discovery_state` update (e.g., only new features were discussed), the plan **merges** the returned fields with the existing state (not a full replace). This is safer but means stale fields are never cleared. Is that acceptable?

---

## Proposed Changes

### Component 1: Dependencies & Environment

#### [NEW] `.env.local`
- `GEMINI_API_KEY` — your Google AI key (server-side only)
- `NEXT_PUBLIC_SUPABASE_URL` — already provided
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon key you provided

---

### Component 2: Database (Supabase)

#### [NEW] `supabase/schema.sql`
SQL script to create the `projects` table. Run this manually in the Supabase SQL Editor.

```sql
CREATE TABLE IF NOT EXISTS public.projects (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,
  title         TEXT NOT NULL DEFAULT 'Untitled Project',
  discovery_state JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: RLS policy for open access (demo mode, no auth)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all (demo)" ON public.projects FOR ALL USING (true) WITH CHECK (true);
```

#### [NEW] `lib/supabase.ts`
Supabase client singleton using `createBrowserClient` from `@supabase/supabase-js`.

---

### Component 3: AI Route — `/api/chat/route.ts`

#### [MODIFY] `app/api/chat/route.ts`
**Replace** the entire mock implementation with a real Gemini 1.5 Pro streaming call.

**Architecture:**
1. Accepts `{ messages: ChatMessage[], projectId: string }` in the POST body.
2. Builds a system prompt instructing Gemini to act as "Pilot" (AI pre-sales engineer).
3. Calls `gemini-1.5-pro` with `generateContentStream`.
4. Streams conversational text tokens directly to the client as `text/plain`.
5. After the full stream completes, generates a **separate** structured JSON `discovery_state` using `generateContent` (non-streaming) with JSON mode.
6. Appends a sentinel line `\n__DISCOVERY_STATE__:` followed by the JSON to the stream before closing.

**System Prompt instructs Gemini to:**
- Act as a friendly, expert pre-sales software engineer named "Pilot".
- Extract and evolve: project name, client name, domain, features (with priority/effort/status), BRD objectives/scope/stakeholders, PRD personas/goals/metrics, SRS functional & non-functional requirements, user stories, and architecture layers.
- Always return well-structured, specific requirements — not generic boilerplate.

---

### Component 4: State Management

#### [MODIFY] `lib/discovery-store.tsx`
**Changes:**
1. Import and initialize the Supabase client.
2. Add a `projectId` state (defaulting to `'demo-project-1'`).
3. Add a `loadFromSupabase()` function that fetches `discovery_state` from the `projects` table on mount.
4. Modify `sendMessage()` to:
   - Pass `projectId` in the POST body.
   - After stream completes, parse the `__DISCOVERY_STATE__:` sentinel from the accumulated response.
   - Extract and strip the JSON from the displayed message content.
   - Call `setDiscovery()` with the merged new state.
   - Upsert the updated state to Supabase.
5. Add a `useEffect` to call `loadFromSupabase()` on mount.
6. Export `projectId` in the context value.

---

### Component 5: UI Updates

#### [MODIFY] `components/workspace.tsx`
- Remove the hardcoded `initialDiscovery` import for `AppHeader` props.
- Use `useDiscovery()` values (`discovery.projectName`, `discovery.domain`) instead.

> [!NOTE]
> `workspace.tsx` currently uses `initialDiscovery` from `mock-data.ts` to set the `AppHeader` props. This will be changed to pull from live discovery state.

#### [MODIFY] `components/discovery-chat.tsx`
- Update the footer label from `MOCK STREAMING DEMO` to `PILOT · GEMINI 1.5 PRO`.

---

## Verification Plan

### Automated Tests
- `pnpm run build` — verifies TypeScript compilation with no errors.
- `pnpm run lint` — checks for any ESLint issues.

### Manual Verification
1. Run `pnpm run dev` and open the app.
2. Type a message in the Discovery Chat (e.g., "We want to build a food delivery app").
3. Verify the chat streams a real Gemini response.
4. Verify the Document Viewer tabs (BRD, PRD, SRS, Features) update with AI-extracted data.
5. Refresh the page and confirm the Supabase data is loaded back into the Document Viewer.
6. Check the Supabase dashboard → Table Editor → `projects` to confirm a row was upserted.

---

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `.env.local` | NEW | Environment variables |
| `supabase/schema.sql` | NEW | Database schema to run manually |
| `lib/supabase.ts` | NEW | Supabase client singleton |
| `app/api/chat/route.ts` | MODIFY | Replace mock with real Gemini streaming |
| `lib/discovery-store.tsx` | MODIFY | Wire Supabase load/save + parse AI JSON |
| `components/workspace.tsx` | MODIFY | Use live discovery state for AppHeader |
| `components/discovery-chat.tsx` | MODIFY | Update footer label |
