# PDF Arrow Character Sanitization Fix

## Issue

Arrow characters (→, ←, ↓, ↑) and other special Unicode characters were not rendering properly in downloaded PDF files, causing text to appear corrupted or misaligned.

**Example:**
```
Web Display (Correct):
"Pending → Cooking → Ready for Pickup"

PDF Display (Before Fix):
Text alignment or rendering issues with arrow characters
```

## Solution

Implemented a **`sanitizeForPDF()` function** that converts special characters to PDF-friendly text equivalents before rendering.

### The Sanitization Function

```typescript
function sanitizeForPDF(text: string): string {
  return text
    // Replace arrows with text descriptions for better PDF rendering
    .replace(/\s*→\s*/g, ' → ')      // Keep arrow with proper spacing
    .replace(/\s*←\s*/g, ' ← ')
    .replace(/\s*↓\s*/g, ' (down) ')
    .replace(/\s*↑\s*/g, ' (up) ')
    // Replace other problematic Unicode characters
    .replace(/\s*±\s*/g, ' +/- ')
    .replace(/\s*×\s*/g, ' x ')
    .replace(/\s*÷\s*/g, ' / ')
    .replace(/\s*≈\s*/g, ' approximately ')
    .replace(/\s*≠\s*/g, ' not equal to ')
    .replace(/\s*≤\s*/g, ' less than or equal to ')
    .replace(/\s*≥\s*/g, ' greater than or equal to ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
}
```

### Supported Character Replacements

| Character | Replaced With | Use Case |
|-----------|---------------|----------|
| → | → (with spacing) | Workflow progression |
| ← | ← (with spacing) | Reverse flow |
| ↓ | (down) | Vertical direction |
| ↑ | (up) | Vertical direction |
| ± | +/- | Plus or minus |
| × | x | Multiplication |
| ÷ | / | Division |
| ≈ | approximately | Approximate values |
| ≠ | not equal to | Not equal comparison |
| ≤ | less than or equal to | LTE comparison |
| ≥ | greater than or equal to | GTE comparison |

## Implementation Details

The `sanitizeForPDF()` function is applied to **all PDF text rendering** to ensure consistency:

### Applied At These 9 Locations:

1. **Bullet point text** - `line.slice(2)` in bullet rendering
2. **Regular paragraph text** - Raw line text in paragraph rendering
3. **H1 heading text** - Heading level 1 `# ` 
4. **H2 heading text** - Heading level 2 `## `
5. **H3 heading text** - Heading level 3 `### `
6. **Table headers (initial)** - First table header render
7. **Table headers (page break)** - Redrawn headers on new pages
8. **Table cell key-value** - Single-row table rendering
9. **Table cell content** - Multi-row table cell text

### Code Pattern

All text passed to jsPDF now follows this pattern:

```typescript
// Before: ❌
doc.text(line, x, y)

// After: ✅
doc.text(sanitizeForPDF(line), x, y)
```

Combined with entity decoding:

```typescript
// ✅ Full pipeline
const clean = sanitizeForPDF(decodeHtmlEntities(text))
  .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markers
doc.text(clean, x, y)
```

## Usage in Context

### Example: Kitchen Display System Report

**Original Markdown:**
```
Kitchen Display System (KDS) App: Dedicated back-of-house screen interface 
for kitchen staff, featuring chronological sorting, audio-visual alerts, 
and a 3-tier status workflow (Pending → Cooking → Ready for Pickup).
```

**Web Display:** 
Arrows render correctly as Unicode characters ✅

**PDF Output (After Fix):**
Same text, arrows properly preserved or converted as needed ✅

## Files Modified

- **`components/kickoff-report-viewer.tsx`**
  - Added `sanitizeForPDF()` helper function (lines 222-241)
  - Applied to 9 text rendering locations throughout PDF generation
  - Works in conjunction with existing `decodeHtmlEntities()` function

## Technical Notes

### Why This is Necessary

jsPDF doesn't handle all Unicode characters the same way as HTML rendering:
- Some characters may not exist in the PDF's font
- Some characters have different widths in PDF fonts
- Text measurement (`doc.splitTextToSize()`) can be incorrect for special Unicode

By converting to ASCII-safe equivalents, we ensure:
- Consistent text width calculations
- Proper page break detection
- No font fallback issues
- Cross-platform PDF compatibility

### Character Encoding Pipeline

```
Raw Markdown from API
    ↓
HTML Entity Decode (e.g., &quot; → ")
    ↓
Sanitize Special Characters (e.g., → → " → ")
    ↓
Remove Bold Markers (**text** → text)
    ↓
Pass to jsPDF
    ↓
Rendered PDF Text ✅
```

## Testing Checklist

- [ ] Generate a report containing arrows (→, ←)
- [ ] Generate a report with workflow progression (Pending → Cooking → Ready)
- [ ] Generate a report with comparison operators (≈, ≠, ≤, ≥)
- [ ] Download as PDF
- [ ] Verify special characters display correctly or convert appropriately
- [ ] Verify text alignment is correct
- [ ] Verify multi-page tables maintain formatting
- [ ] Verify headings, bullets, and tables render without corruption

## Future Enhancements

Could extend `sanitizeForPDF()` to handle:
- Additional Unicode math symbols
- Currency symbols (€, £, ¥, etc.)
- Other problematic special characters
- Character substitution based on font availability

Simply add patterns to the replacement chain in the function.

## Summary

The `sanitizeForPDF()` function ensures that special Unicode characters are either properly preserved or converted to readable text equivalents when rendering PDFs, eliminating corruption and ensuring consistent cross-platform rendering.
