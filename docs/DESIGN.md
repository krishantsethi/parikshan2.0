# Design system

## Identity

A calm, clinical “deep space” aesthetic: midnight navy surfaces, a precise scientific grid, and cyan/azure accents reserved for interaction and state. The brand mark combines a hexagonal verification frame, an ECG trace (health), and a central node (intelligence).

## Tokens (Tailwind v4 CSS variables)

| Token | Dark | Light | Usage |
| --- | --- | --- | --- |
| `--color-base` | `#07111f` | `#f2f6fb` | Page background |
| `--color-base-deep` | `#04090f` | `#e3ebf5` | Gradient floor, overlays |
| `--color-panel` | `#101e31` | `#ffffff` | Cards/surfaces |
| `--color-panel-raised` | `#16283f` | `#f7fafd` | Nested surfaces, dialogs |
| `--color-ink` | `#f4f8fc` | `#0c1c30` | Primary text |
| `--color-muted` | `#9aadc4` | `#4c617e` | Secondary text |
| `--color-faint` | `#64789a` | `#7d90a9` | Tertiary labels |
| `--color-accent` | `#42e8f5` | `#0e9bb4` | Primary accent |
| `--color-azure` | `#5b8cff` | `#3467e8` | Secondary accent |
| `--color-success/warning/danger` | `#3ddc97` / `#f5b94d` / `#f2697f` | darker equivalents | Semantic states |

Radii: `--radius-card` 1rem, `--radius-field` 0.625rem. Elevation: `--shadow-panel`, `--shadow-raised`, `--shadow-glow`. Motion: `--ease-out-expo`, `--ease-spring`.

Fonts: system UI stack with Inter first, Devanagari fallback; monospace for all clinical values (tabular alignment matters).

## Surfaces & texture

- `.app-backdrop` — layered radial gradients over the base.
- `.grid-overlay` — 48px scientific grid with a radial mask; used sparingly in hero/section headers.
- `.panel` / `.panel-raised` — translucent card with hairline border and layered shadow.
- `.text-gradient` — restrained ink→cyan→azure gradient for a single hero phrase.

## Motion

Purposeful primitives only: staggered reveals (once), counters, dialog/drawer springs, tab indicator, upload scan line, processing shimmer. All animation respects `prefers-reduced-motion` globally (durations collapse via CSS) and via `useReducedMotion` for React-driven motion. No animation is applied to critical numeric values without a static fallback.

**Motion is fail-open.** Server-rendered markup is always fully visible and always shows real values; animation is layered on only after React mounts. `Reveal` drives its entrance from `animate` rather than `initial`, so no inline `opacity:0` is ever committed to the SSR HTML, and `AnimatedCounter` renders the true value rather than counting up from a misleading `0`. This matters because an entrance animation that depends on hydration *and* an IntersectionObserver will silently strand content invisible when scripts are blocked, slow, or when the observer never fires inside a throttled cross-origin iframe. A `<noscript>` rule in the root layout forces `[data-pk-reveal]` visible as a final backstop. Covered by `tests/components/reveal-fail-open.test.tsx`.

## VFX decisions

- One WebGL canvas, only on the landing hero.
- Dynamically imported; never shipped to other routes.
- **No postprocessing pass** — glow is simulated with additive particles, emissive colors, and CSS gradients. This keeps the frame budget predictable.
- DPR capped at 1.6; pointer parallax damped; particle count 850.
- Fallbacks: CSS/SVG orbit for reduced motion, no WebGL, or viewports ≤ 380px. The breakpoint is deliberately low so the WebGL core reaches ordinary phones and narrow preview panels; the scene's cost controls above are what keep that affordable, not the breakpoint.

## Components

Primitives: Button, ButtonLink, Input, Textarea, Select, Checkbox, Card, Badge, Alert, Dialog, Dropdown, Tabs, Accordion, Tooltip, Switch, Progress, Avatar, Skeleton, EmptyState, toast system.
Composite: document uploader, extraction review table, trend explorer, medication manager, interaction panel, assistant chat, profile manager, stat cards, page header, marketing sections.

## Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `footer`), skip links on both shells.
- Focus-visible outlines are global and never removed.
- Dialogs: focus moved in, Escape closes, focus restored, `aria-modal`, labelled by title.
- Tabs: roving tabindex with arrow-key support; accordion uses `aria-expanded`/`aria-controls`.
- Toasts announce via `aria-live="polite"`; danger alerts use `role="alert"`.
- Color is never the only signal: flags include text/letters, statuses include icons and labels.
- Contrast targets: body text ≥ 4.5:1 against panels in both themes (muted text is used for secondary copy only).

## Responsive behavior

Mobile-first layouts: dashboard sidebar becomes a drawer, tables scroll horizontally, hero visual is skipped on small screens, chat and upload remain thumb-reachable.
