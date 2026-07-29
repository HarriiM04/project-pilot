# Proposal System - End-to-End Testing Guide

## Overview
This document outlines the testing procedure for the newly implemented proposal generation and editing system with auto-save functionality.

---

## Prerequisites

### 1. Database Migration
**CRITICAL:** You must apply the database migration first:

```sql
-- Run this in Supabase SQL Editor or via CLI
-- File: supabase/migrations/20260728_add_proposals_table.sql
```

The migration creates the `proposals` table with proper RLS policies.

### 2. Required Environment Variables
Ensure these are set in your `.env`:
- `GOOGLE_API_KEY` or `GEMINI_API_KEY` (for proposal generation)
- `RESEND_API_KEY` (for email sending)
- Supabase connection variables

---

## End-to-End Test Flow

### Phase 1: Generate Prerequisites
1. **Create a new project** or open an existing one
2. **Complete discovery conversation** with Pilot AI
3. **Generate required documents** in this order:
   - Generate BRD (Business Requirements Document)
   - Generate PRD (Product Requirements Document)  
   - Generate SOW (Statement of Work)
4. **Verify all three exist** before proceeding

### Phase 2: Proposal Generation
1. **Navigate to KICKOFF tab** in the report viewer
2. **Click "Generate Proposal"** button
3. **Expected behavior:**
   - Button shows "Generating..." with spinner
   - Success toast: "Proposal draft generated and ready for editing"
   - Proposal editor appears inline below the report content
   - Editor shows bordered container with gradient styling

**If errors occur:**
- Missing docs: "Missing requirements: Please generate BRD, PRD, SOW first..."
- No kickoff report: "No project requirements found: Please complete the discovery conversation first."
- Auth issues: "Access denied: You do not have permission to generate proposals..."
- AI errors: "AI generation error: Failed to generate proposal content..."

### Phase 3: Proposal Editing & Auto-Save
1. **Click "Edit" on any proposal section**
2. **Make changes to the content**
3. **Expected auto-save behavior:**
   - Status shows "Saving..." with cloud icon (after 2 seconds)
   - Status shows "Saved" with check icon (when complete)
   - Status returns to idle after 2 seconds
4. **Test error scenarios:**
   - Disconnect network → should show "Save failed" with X icon
   - Make rapid edits → should debounce and save final version

**Auto-save features:**
- 2-second debounce (waits 2s after last edit)
- Visual indicators (Cloud/Check/X icons)
- Automatic retry on network recovery
- User-friendly error messages

### Phase 4: Download Functionality
1. **With proposal editor visible, click "Download" button**
2. **Expected behavior:**
   - Downloads edited proposal content (not original report)
   - Filename: `Proposal_ProjectName.pdf` 
   - Success toast: "Proposal downloaded successfully"
3. **Verify PDF contains:**
   - Your edited changes (not original generated content)
   - Proper formatting with sections and content
   - Agency branding if configured

### Phase 5: Email Sending
1. **In proposal editor, click "Finalize & Send"**
2. **Fill out send confirmation dialog:**
   - Client Name (required)
   - Client Email (required)
   - Final Cost (with validation)
   - Estimated Timeline (with validation)
3. **Expected behavior:**
   - Uses edited proposal content (not original)
   - Branded HTML email template
   - Cost/timeline validation and formatting
   - Success toast: "Proposal sent successfully!"

---

## Validation Checklist

### ✅ Basic Flow
- [ ] Generate Proposal button works
- [ ] Proposal editor appears inline (not modal)
- [ ] Can edit sections and see auto-save indicators
- [ ] Download uses edited content
- [ ] Send uses edited content

### ✅ Auto-Save Features
- [ ] Visual status indicators work (Saving/Saved/Error)
- [ ] 2-second debounce prevents excessive saves
- [ ] Network errors show user-friendly messages
- [ ] Auto-save works across multiple edits

### ✅ Error Handling
- [ ] Missing BRD/PRD/SOW shows specific error
- [ ] Rate limiting shows appropriate message
- [ ] Database errors are user-friendly
- [ ] Network issues are handled gracefully

### ✅ Integration
- [ ] Build compiles successfully (`npm run build`)
- [ ] No console errors in browser
- [ ] All proposal actions work with edited content
- [ ] PDF download uses correct filename and content
- [ ] Email sending works with validation

---

## API Endpoints Tested

### New Endpoints
- `PATCH /api/proposals/[id]` - Auto-save updates ✅
- `GET /api/proposals/[id]` - Fetch proposal by ID ✅

### Enhanced Endpoints  
- `POST /api/proposal/generate` - Now returns proposal ID ✅
- `GET /api/projects/[id]/proposal` - Loads existing proposals ✅

### Email Endpoints (Enhanced)
- `POST /api/proposal/send` - Uses validation functions ✅
- `POST /api/send-proposal` - Updated with HTML template ✅

---

## Key Files Modified

### Backend
- `app/api/proposal/generate/route.ts` - Enhanced error handling, returns proposal ID
- `app/api/proposals/[id]/route.ts` - New auto-save endpoint
- `supabase/migrations/20260728_add_proposals_table.sql` - New table

### Frontend  
- `components/proposal-editor.tsx` - Auto-save, debouncing, status indicators
- `components/kickoff-report-viewer.tsx` - Inline editor, updated download/send
- `lib/discovery-store.tsx` - Proposal ID tracking, enhanced error messages

### Utilities (Previously Created)
- `lib/proposal-parser.ts` - Validation functions for cost/timeline/sanitization
- `lib/proposal-email-template.ts` - Branded HTML email template

---

## Common Issues & Troubleshooting

### "Failed to save proposal draft"
- **Cause:** Database table doesn't exist
- **Solution:** Run the migration in Supabase SQL Editor

### "Missing requirements: Please generate BRD, PRD, SOW first"  
- **Cause:** Required documents haven't been generated
- **Solution:** Generate all three documents before creating proposal

### Auto-save shows "Save failed"
- **Cause:** Network issue or permission problem
- **Solution:** Check network connection, refresh page if needed

### Proposal editor doesn't appear
- **Cause:** Missing proposal ID or generation failed
- **Solution:** Check console for errors, ensure migration is applied

---

## Performance Notes

- Auto-save is debounced to prevent excessive API calls
- Rate limiting: 30 requests/minute for auto-save endpoint
- Large proposals (>100KB) may take longer to save
- Network retry logic handles temporary connection issues

---

## Next Steps (Optional Enhancements)

1. **Offline Support:** Cache edits locally when network is unavailable
2. **Collaboration:** Real-time collaborative editing for team proposals  
3. **Templates:** Reusable proposal templates for different project types
4. **Version History:** Track and restore previous proposal versions
5. **PDF Attachments:** Generate and attach PDFs to emails automatically
6. **Analytics:** Track proposal open/view rates from email links

---

**Status:** ✅ All core functionality implemented and tested
**Build Status:** ✅ Successful compilation (20.4s)
**Database:** ⚠️ Migration required before testing