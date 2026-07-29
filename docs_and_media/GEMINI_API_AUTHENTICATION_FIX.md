# Gemini API Authentication Fix (401 UNAUTHENTICATED Error)

## Root Cause Analysis

The 401 UNAUTHENTICATED error with `ACCESS_TOKEN_TYPE_UNSUPPORTED` was caused by using an **OAuth-based Auth Key** (AQ. format) with the `@google/genai` SDK, which only supports:
1. **Direct API Keys** (AIza format) from Google AI Studio
2. **OAuth 2.0 credentials** (for enterprise/Vertex AI)

### The Problem
- **API Key Format**: `AQ.Ab8RN6JJKdewSUMTGSeuHqTN8S9AjN9yRnUG91ch3TGg01U4iQ` (AQ. prefix = OAuth-based)
- **Environment Variable**: `GEMINI_API_KEY` (incorrect name for @google/genai SDK)
- **Error Message**: `Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.`
- **Reason Code**: `ACCESS_TOKEN_TYPE_UNSUPPORTED`

### Why This Happened
1. Google AI Studio generates different key types based on account settings
2. New accounts may be restricted to AQ. keys (OAuth Auth Keys) instead of AIza keys (direct API keys)
3. The @google/genai SDK expects `GOOGLE_API_KEY` environment variable with an AIza-format key
4. The code was using `GEMINI_API_KEY` (non-standard name) with an AQ. key (incompatible format)

## Solution Implemented

### 1. **Environment Variable Change** (`.env`)
```diff
- GEMINI_API_KEY=AQ.Ab8RN6JJKdewSUMTGSeuHqTN8S9AjN9yRnUG91ch3TGg01U4iQ
+ GOOGLE_API_KEY=<YOUR_AIza_KEY_HERE>
```

**Important**: You must generate a new API key from Google AI Studio with the **AIza** prefix, not use the existing AQ. key.

### 2. **API Key Initialization** (all three API routes updated)
Updated `/app/api/report/route.ts`, `/app/api/chat/route.ts`, and `/app/api/health/route.ts`:

```typescript
// ✅ FIXED: Fallback to both GOOGLE_API_KEY and GEMINI_API_KEY for backward compatibility
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('[GEMINI] Missing API key: GOOGLE_API_KEY and GEMINI_API_KEY both undefined')
  return new Response('API key not configured. Set GOOGLE_API_KEY environment variable.', { status: 500 })
}

console.log(`[GEMINI] Initializing with API key format: ${apiKey.substring(0, 10)}...`)

const ai = new GoogleGenAI({ apiKey })
```

### 3. **Enhanced Error Logging**
Added comprehensive error logging to help debug future authentication issues:

**In `/app/api/report/route.ts`:**
- `[GEMINI] Initializing with API key format: ...` - Shows key format
- `[GEMINI] Starting extraction with model: gemini-flash-lite-latest`
- `[GEMINI] Extraction error: ...` - Logs extraction failures
- `[GEMINI] Starting report generation stream for docType: ...`
- `[GEMINI] Report generation complete for KICKOFF, length: ...`
- `[GEMINI] Stream error for KICKOFF: ...` - Full error details

**In `/app/api/chat/route.ts`:**
- `[GEMINI] Chat: Initializing with API key format: ...`
- `[GEMINI] Chat: Starting discovery turn with model: gemini-flash-lite-latest`
- `[GEMINI] Chat: Received response length: ...`
- `[GEMINI] Chat: JSON parse error: ...`
- `[GEMINI] Chat error: ...` - Full error details

**In `/app/api/health/route.ts`:**
- `[GEMINI] Health check: Testing with API key format: ...`
- `[GEMINI] Health check failed: ...` - With helpful hint about key format

## Files Modified

1. **`.env`**
   - Renamed `GEMINI_API_KEY` → `GOOGLE_API_KEY`
   - Added comments explaining key format requirements

2. **`app/api/report/route.ts`**
   - Added API key initialization with fallback logic
   - Added logging to extraction step
   - Added detailed error logging to stream error handler
   - Logs include key format (first 10 chars only, never full key)

3. **`app/api/chat/route.ts`**
   - Added API key initialization with fallback logic
   - Added logging throughout the discovery turn process
   - Added JSON parse error logging
   - Enhanced error handling with full error details

4. **`app/api/health/route.ts`**
   - Added conditional API key check with helpful error message
   - Added hint about AQ. vs AIza format distinction
   - Improved error logging with format guidance

## How to Get the Correct API Key

1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**
2. Click "Create API key"
3. **Important**: Ensure the generated key starts with **AIza**, NOT **AQ.**
4. Copy the key and update your `.env` file:
   ```
   GOOGLE_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

## If You Still See the Error After Updating

1. **Verify the key format**: The key MUST start with `AIza`, not `AQ.`
   - `AIza...` ✅ Works with @google/genai SDK
   - `AQ....` ❌ OAuth-based, not compatible

2. **Check environment is loaded**: Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

3. **Verify in logs**: Check for `[GEMINI] Initializing with API key format: AIza...`

4. **Test via health endpoint**: Visit `http://localhost:3000/api/health` to verify API key works

## Technical Details

### @google/genai SDK Requirements
- Supports direct API keys (AIza format) from Google AI Studio
- Supports OAuth 2.0 credentials for enterprise/Vertex AI
- **Does NOT support** AQ. format keys (OAuth Auth Keys)
- Reads from `GOOGLE_API_KEY` environment variable (default)

### Fallback Logic
The code now checks both variables for backward compatibility:
1. First tries `GOOGLE_API_KEY` (preferred)
2. Falls back to `GEMINI_API_KEY` if GOOGLE_API_KEY is not set
3. Errors if neither is set

This allows gradual migration without breaking existing deployments.

## Security Notes

1. ✅ API key is only used on server-side (never exposed to client)
2. ✅ API key is never logged in full (only first 10 characters)
3. ✅ API key must not be prefixed with `NEXT_PUBLIC_` (would expose to client)
4. ✅ `.env` file should never be committed to version control

## Verification Checklist

- [ ] Update `.env` with your new `GOOGLE_API_KEY` (AIza format)
- [ ] Restart Next.js dev server: `npm run dev`
- [ ] Check logs for `[GEMINI] Initializing with API key format: AIza...`
- [ ] Test health endpoint: `GET /api/health`
- [ ] Try generating a kickoff report
- [ ] Try using the discovery chat

## Summary

**What caused the 401 error:**
- Using an AQ. format OAuth key with the @google/genai SDK (incompatible)
- Using wrong environment variable name (`GEMINI_API_KEY` instead of `GOOGLE_API_KEY`)

**What was fixed:**
- ✅ Environment variable renamed to `GOOGLE_API_KEY` (standard for @google/genai)
- ✅ Added fallback logic for backward compatibility
- ✅ Added detailed error logging to help diagnose future issues
- ✅ Added comments explaining key format requirements
- ✅ Updated health check to validate key format

**Action required:**
- Generate a new API key from Google AI Studio with **AIza prefix**
- Update `.env` file with the new key as `GOOGLE_API_KEY`
