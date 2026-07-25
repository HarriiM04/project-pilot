'use client'

/**
 * ProjectPilot brand mark
 *
 * - Bold "P" letterform (pColor prop: white on dark bg, navy on light bg)
 * - Classic paper plane shape overlapping bottom-left of the P
 *   · Upper face: bright blue gradient
 *   · Lower face: deep indigo (shadow)
 *   · A recognisable paper-plane silhouette (not just triangles)
 */

export function BrandMark({
  className = '',
  pColor,
}: {
  className?: string
  pColor?: string
}) {
  // If no pColor provided, use CSS variable so it responds to dark/light mode
  const resolvedColor = pColor ?? 'var(--foreground)'

  return (
    <svg
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ProjectPilot"
    >
      <defs>
        {/* Plane upper face — bright blue */}
        <linearGradient id="plane-top" x1="5" y1="95" x2="65" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        {/* Plane lower face — deep indigo */}
        <linearGradient id="plane-bot" x1="5" y1="65" x2="45" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#312e81" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      {/* ── Bold "P" ──────────────────────────────────────────
          Stem  : x=8–26, y=5–108
          Bowl  : right side, upper 60% of height
          Counter (hole) punched out with same bg as panel.
          We use `currentColor` trick via SVG evenodd fill rule
          so the hole is transparent regardless of background.
      ──────────────────────────────────────────────────────── */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="
          M 8 5
          L 8 108
          L 26 108
          L 26 72
          L 36 72
          C 62 72 76 58 76 40
          C 76 22 62 5 36 5
          Z
          M 26 20
          L 36 20
          C 52 20 60 28 60 40
          C 60 52 52 60 36 60
          L 26 60
          Z
        "
        fill={resolvedColor}
      />

      {/* ── Paper plane ───────────────────────────────────────
          Classic paper-plane shape:
          Nose points upper-right.
          Sits at the bottom-left, overlapping the stem.

          Shape breakdown:
            Nose      : (68, 28)  — tip, upper-right
            Body-back  : (6, 105) — tail bottom-left
            Wing-top   : (6,  62) — where top wing meets tail
            Fold-crease: (32, 72) — internal fold line midpoint

          Upper wing  (large, bright blue)  = Nose → Body-back → Crease
          Lower belly (dark indigo)         = Nose → Wing-top  → Crease
          Tail flap   (darkest)             = Body-back → Crease → Wing-top
      ──────────────────────────────────────────────────────── */}
      {/* Upper wing — bright blue, the dominant face */}
      <path
        d="M 68 28  L 6 105  L 32 72  Z"
        fill="url(#plane-top)"
      />
      {/* Lower belly — deep indigo */}
      <path
        d="M 68 28  L 6 62   L 32 72  Z"
        fill="url(#plane-bot)"
      />
      {/* Tail flap — very dark sliver connecting the two */}
      <path
        d="M 6 105  L 32 72  L 6 62  Z"
        fill="#1e1b4b"
        opacity="0.9"
      />
    </svg>
  )
}

// ── Full horizontal lockup ────────────────────────────────────────────────────
export function BrandLockup({
  className    = '',
  textSize     = 'text-xl',
  showTagline  = false,
  variant      = 'auto',
  animateLogo  = false,
}: {
  className?:   string
  textSize?:    string
  showTagline?: boolean
  variant?:     'light' | 'dark' | 'auto'
  animateLogo?: boolean   // kept for API compatibility, no animation per user request
}) {
  const iconSize =
    textSize === 'text-sm'   ? 'h-8 w-8'   :
    textSize === 'text-base' ? 'h-9 w-9'   :
    textSize === 'text-lg'   ? 'h-10 w-10' :
    'h-11 w-11'

  // pColor: explicit for light/dark, undefined for auto (uses CSS var(--foreground))
  const pColor       = variant === 'light' ? '#ffffff' : variant === 'dark' ? '#1a2340' : undefined
  const projectColor = variant === 'light' ? '#ffffff' : variant === 'dark' ? '#1a2340' : undefined
  const projectClass = variant === 'auto'  ? 'text-foreground' : ''
  const taglineClass = variant === 'light' ? 'text-white/50'   : 'text-muted-foreground'

  return (
    <div className={`flex items-center ${className}`}>
      <BrandMark className={`shrink-0 ${iconSize}`} pColor={pColor} />
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight ${textSize}`}>
          <span
            className={projectClass}
            style={projectColor ? { color: projectColor } : undefined}
          >
            Project{' '}
          </span>
          <span style={{
            background: 'linear-gradient(135deg, #2d6ef5 0%, #6b5ce7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Pilot
          </span>
        </span>
        {showTagline && (
          <span className={`mt-0.5 font-mono text-[9px] tracking-widest ${taglineClass}`}>
            AI PRE-SALES ENGINEER
          </span>
        )}
      </div>
    </div>
  )
}

// ── Compact icon-only ─────────────────────────────────────────────────────────
export function BrandIcon({
  className = '',
  onDark    = false,
}: {
  className?: string
  onDark?:    boolean
}) {
  return (
    <BrandMark
      className={className}
      pColor={onDark ? '#ffffff' : '#1a2340'}
    />
  )
}
