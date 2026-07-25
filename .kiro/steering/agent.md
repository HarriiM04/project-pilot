---
inclusion: always
---

# ProjectPilot — Agent Rules

## Animation & UI Libraries

Every UI task in this project **must** use the following libraries for animations and components. Always check these sources before writing custom CSS animation from scratch.

### 1. GSAP — https://gsap.com/
**Use for:** Complex sequenced animations, scroll-triggered effects, text splitting, number counters, timeline orchestration.

- Import: `import gsap from 'gsap'` and `import { useGSAP } from '@gsap/react'`
- Always register plugins at module level: `gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP)`
- Use `useGSAP({ scope: containerRef })` for React components — this auto-reverts on unmount
- Use `SplitText` for headline word/char animations
- Use `ScrollTrigger` for scroll-based reveals and parallax
- Use `gsap.timeline()` to sequence entrance animations with stagger

```ts
// Standard entrance pattern
const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
tl.fromTo(elements, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.5 })
```

### 2. UIverse.io — https://uiverse.io/ui-kits
**Use for:** Buttons with shimmer/ripple effects, animated inputs, loaders, toggles, CSS card hover effects.

- All components are copy-paste CSS/Tailwind — no npm install needed
- Preferred patterns: shimmer `::before` sweep on buttons, floating label inputs, breathing pulse dots
- Adapt colors to use CSS variables (`var(--primary)`, `var(--ring)`) not hardcoded hex

### 3. TasteSkill.dev — https://www.tasteskill.dev/
**Use for:** Micro-interactions, hover effects, card 3D tilt, form field polish, transition snippets.

- Copy CSS/Tailwind snippets and adapt to project variables
- Great for subtle `hover:-translate-y-1 hover:shadow-lg` card lifts and border glow effects

### 4. 21st.dev — https://21st.dev/
**Use for:** Drop-in React + Tailwind components — animated tabs, hero sections, feature grids, scroll reveals, text effects.

- All components are shadcn/ui-compatible — just copy the JSX/TSX
- Prefer Motion Primitives (https://21st.dev/community/ibelick/library/motion-primitives) for reusable animation building blocks
- Use for: sliding tab indicators, animated empty states, staggered feature card grids

### 5. shadcn/ui — already installed
**Use for:** Core UI primitives (Dialog, Button, etc.). Always extend with animations from the libraries above rather than using plain static shadcn components.

---

## General Rules

- **Always mobile-first and fully responsive.** Every component must work at 320px width and up.
- **Never break existing functionality** when adding animations. Auth, routing, Supabase calls, streaming — all must keep working.
- **Use `will-change: transform` sparingly** — only on actively animating elements.
- **Prefer CSS transitions** for hover/focus micro-interactions; use GSAP only for entrance/scroll/complex sequences.
- **Dark mode must work.** All animations and color usages must respect `.dark` class. Use CSS variables, not hardcoded hex (exception: brand colors from `brand-logo.tsx`).
