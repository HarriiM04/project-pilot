# Fix: Proposal Re-rendering on Save

## Issue Description

When editing and saving a proposal section, the **entire proposal was being re-rendered/regenerated** instead of just updating the edited section in place. This caused:
- All sections to reload
- Loss of scroll position
- Jarring user experience

## Root Cause

The issue was in the `ProposalEditor` component's useEffect dependency:

```typescript
// ❌ PROBLEM: Re-parses on EVERY initialMarkdown change
useEffect(() => {
  const parsed = parseProposalMarkdown(initialMarkdown)
  setSections(parsed)
}, [initialMarkdown])  // ← Triggers too often!
```

### The Re-render Loop:

1. User edits section → clicks Save
2. `handleSaveEdit` updates `sections` state locally ✅
3. Auto-save sends data to API ✅
4. API saves successfully ✅
5. `onUpdate(markdown)` is called → updates parent's `proposalDraft` ✅
6. Parent re-renders `<ProposalEditor initialMarkdown={proposalDraft} />` 
7. **`initialMarkdown` prop changes → useEffect triggers → re-parses everything** ❌
8. All sections reset → entire UI refreshes ❌

## The Fix ✅

Added a `useRef` flag to track when updates come from our own saves:

```typescript
const isLocalUpdate = useRef(false)

// Parse markdown into editable sections
useEffect(() => {
  // Don't re-parse if this is our own update
  if (isLocalUpdate.current) {
    isLocalUpdate.current = false
    return  // ← Skip re-parsing
  }
  
  const parsed = parseProposalMarkdown(initialMarkdown)
  setSections(parsed)
}, [initialMarkdown])
```

And set the flag before calling `onUpdate`:

```typescript
setSaveStatus('saved')

// Mark this as our own update to prevent re-parsing
isLocalUpdate.current = true

// Notify parent component of the update
if (onUpdate) {
  onUpdate(markdown)
}
```

## How It Works Now

### When User Saves Their Own Edit:
1. User edits section → clicks Save
2. `handleSaveEdit` updates `sections` state locally ✅
3. Auto-save sends data to API ✅
4. API saves successfully ✅
5. **`isLocalUpdate.current = true`** ✅
6. `onUpdate(markdown)` is called → updates parent's `proposalDraft` ✅
7. Parent re-renders `<ProposalEditor initialMarkdown={proposalDraft} />`
8. **useEffect checks `isLocalUpdate.current` → TRUE → returns early** ✅
9. **Sections stay as-is, no re-parsing** ✅
10. User sees smooth update with no flash ✅

### When Proposal Is Regenerated:
1. User clicks "Generate Proposal Draft" again
2. New proposal markdown generated
3. Parent updates `proposalDraft` with completely new content
4. `proposalId` changes (triggers reset useEffect)
5. **`isLocalUpdate.current` is false (wasn't our update)**
6. useEffect runs → re-parses new proposal ✅
7. All sections update with new content ✅

## Files Modified

### `components/proposal-editor.tsx`

**Changes:**
1. Added `isLocalUpdate` ref to track our own updates
2. Modified parse useEffect to check the ref and skip if true
3. Set `isLocalUpdate.current = true` before calling `onUpdate`
4. Auto-reset to false at the start of useEffect

**Lines affected:** ~44-62, ~140-148

## Testing

1. **Edit a section:**
   - Click Edit on any section
   - Make changes
   - Click Save
   - **Expected:** Section updates smoothly, no flash/re-render of other sections

2. **Edit multiple sections:**
   - Edit section 1 → Save
   - Edit section 2 → Save
   - Edit section 3 → Save
   - **Expected:** Each saves smoothly without affecting others

3. **Regenerate proposal:**
   - Go back and click "Generate Proposal Draft" again
   - **Expected:** Entire proposal updates with new content (this is correct)

## Expected Behavior

### ✅ What Should Happen:
- Edit section → Save → **Only that section updates**
- **No flash/reload of entire proposal**
- Scroll position maintained
- Other sections stay exactly as they were
- "Saved" indicator appears briefly

### ❌ What Should NOT Happen:
- ~~Entire proposal reloading~~
- ~~All sections re-rendering~~
- ~~Losing scroll position~~
- ~~Brief flash/flicker~~

## Technical Details

### State Management:
- **Local state:** `sections` array holds parsed proposal sections
- **Parent state:** `proposalDraft` holds full markdown string
- **Sync:** They only sync when necessary (new proposal or regeneration)

### Update Flow:
```
User Edit → Local State → Auto-save → Database → Parent State (flagged) → Skip Re-parse
```

### Regeneration Flow:
```
Generate → New Markdown → Parent State → No Flag → Re-parse ✅
```

## Build Status

✅ **Build successful** - No compilation errors

---

**Last Updated:** 2025-07-29  
**Fix:** Prevent re-parsing on local updates
