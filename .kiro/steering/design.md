---
inclusion: always
---

# ProjectPilot — Design System

## Brand Identity

### Logo
- **Component:** `@/components/brand-logo.tsx`
- **Never** use `FileStack` or any generic icon as the app logo — always use `<BrandLockup>` or `<BrandMark>`
- Use `variant="light"` on dark backgrounds (navy panels, dark mode headers)
- Use `variant="dark"` on light backgrounds (white/gray headers, sidebars)
- Use `variant="auto"` when the background can switch between light/dark mode

```tsx
import { BrandLockup, BrandMark, BrandIcon } from '@/components/brand-logo'

// Full wordmark — light bg
<BrandLockup textSize="text-base" variant="dark" />

// Full wordmark — dark bg
<BrandLockup textSize="text-lg" variant="light" />

// Icon only (for collapsed sidebar, favicons, etc.)
<BrandMark className="size-8" />
```

---

## Color Palette (extracted from logo)

All colors are defined as CSS variables in `app/globals.css`.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--primary` | Navy `#1a2340` | Off-white `#f0f2ff` | Buttons, headings, primary actions |
| `--ring` | Electric blue `#2d6ef5` | Bright blue `#4d84f7` | Focus rings, active states |
| `--accent` | Light blue tint | Deep blue tint | Badges, tags, highlights |
| `--chart-1` | Electric blue | Bright blue | Progress rings, charts |
| `--chart-2` | Purple `#6b5ce7` | Purple `#8b7ff7` | Secondary data, gradients |

### Brand Gradient
The signature gradient from the logo (blue → purple):
```css
/* CSS utility class */
.brand-gradient { background: linear-gradient(135deg, #2d6ef5 0%, #6b5ce7 100%); }
.brand-text-gradient { /* apply to text with bg-clip-text text-transparent */ }
```

Use the brand gradient on:
- Primary CTA buttons (Sign In, Create Account, Generate Report)
- Active/selected state indicators
- Hero section accents

---

## Typography

- **Font:** Geist Sans (default), Geist Mono (for labels, badges, code)
- **Headline animation:** Always use GSAP `SplitText` word-by-word for page hero headlines
- **Badge labels:** `font-mono text-[10px] tracking-widest uppercase`

---

## Icons

- **Icon Library:** [Lucide Icons](https://lucide.dev/) — **ALWAYS** use Lucide icons for all UI elements
- **Never** use other icon libraries (Heroicons, FontAwesome, Material Icons, etc.)
- Import from `lucide-react`: `import { IconName } from 'lucide-react'`
- Common icons:
  - Navigation: `Menu`, `X`, `ChevronDown`, `ChevronRight`, `ArrowLeft`
  - Actions: `Plus`, `Edit`, `Trash2`, `Save`, `Download`, `Upload`
  - User: `User`, `Mail`, `LogOut`, `Settings`
  - Status: `Check`, `CheckCircle2`, `AlertCircle`, `Info`, `Loader2` (animated spinner)
  - Files: `File`, `Folder`, `FolderOpen`, `FileText`
  - UI: `Search`, `Filter`, `MoreVertical`, `Eye`, `EyeOff`
  - Notifications: `Bell`, `BellOff`, `MessageSquare`

**Icon sizing:**
- Small UI (badges, inline): `size-3` or `size-3.5`
- Standard buttons: `size-4`
- Larger buttons/headers: `size-5` or `size-6`
- Empty states/hero: `size-10` or larger

**Always use `className` for styling** — never use inline `style` for icon sizing.

---

## Component Patterns

### Buttons — Primary CTA
```tsx
// Brand gradient + shimmer sweep on hover
style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 55%, #6b5ce7 100%)' }}
className="relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full
  before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent
  before:transition-transform before:duration-700 hover:before:translate-x-full
  hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
```

### Inputs — Floating Label
```tsx
// Floating label lifts on focus/fill + blue glow ring
// See AnimatedInput component in app/auth/page.tsx for reference
```

### Tab Switcher — Sliding Pill
```tsx
// Animated background div translates between tabs
// Spring easing: cubic-bezier(0.34, 1.56, 0.64, 1)
// See TabSwitcher in app/auth/page.tsx for reference
```

### Cards
- Default: `rounded-2xl border border-border bg-card shadow-sm`
- Hover: `hover:border-ring/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`
- On dark panels: `border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm`

### Badges / Tags
```tsx
// Domain / status badges
className="rounded-full border border-accent bg-accent/30 px-2.5 py-0.5
           font-mono text-[10px] tracking-wide text-accent-foreground"
```

---

## Layout Patterns

### Auth Page (Split Layout)
- Left 45%: Deep navy `#0f1628` branding panel — always `variant="light"` logo
- Right 55%: Light background form panel — always `variant="dark"` logo on mobile
- Mobile: branding panel hidden, form fills full screen with logo at top

### Workspace (Sidebar + Main)
- Sidebar: `bg-sidebar` (light navy-tinted) — `variant="dark"` logo
- Header: `bg-background/80 backdrop-blur` — `variant="auto"` logo

---

## Accessibility

- All animated elements must respect `prefers-reduced-motion` — use GSAP's `matchMedia` or CSS `@media (prefers-reduced-motion: reduce)` to disable non-essential animations
- Focus rings must always be visible: `focus-visible:ring-4 focus-visible:ring-ring/30`
- Interactive elements minimum touch target: `min-h-[44px]` on mobile
- Color contrast: text on brand gradient must be white (`text-white`)

---

## Do Not

- ❌ Use `FileStack` or any generic icon as the ProjectPilot logo
- ❌ Use hardcoded hex colors except for brand colors in `brand-logo.tsx`
- ❌ Use `bg-green-500` or other non-brand Tailwind color classes for primary UI (use CSS vars)
- ❌ Add animations without testing dark mode
- ❌ Break existing Supabase auth flow, streaming, or routing when styling
- ❌ Use `motion/react` (Framer Motion) — this project uses GSAP as the animation engine
