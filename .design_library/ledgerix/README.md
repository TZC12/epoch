# Ledgerix Design System

A design system reconstruction of **Ledgerix** — an AI-driven financial analysis platform for small businesses that simplifies complex data, identifies trends, and delivers actionable insights. The system is purpose-built for a mobile-first financial dashboard: dense, scannable data surfaces where the AI earns trust by being legible, not clever.

> *"We want to elevate Ledgerix with AI-driven insights that simplify finances and genuinely empower small business owners to act faster."* — Marcus Hale, Co-founder, Ledgerix

> *"You understood exactly what we needed clean, smart, and fast."* — Marcus Hale, Co-founder, Ledgerix

### Source: Behance gallery + published case study (rondesignlab), 2025. Brand owner: Ledgerix, Washington USA.

### What this covers: Foundations (with key values), Components (6 core: Button, Card, Table, Chart, Navigation, Sidebar), Sample kit.

## 2. Content Fundamentals

### Voice & tone

Ledgerix writes like a CFO who happens to be a good teacher: professional and trustworthy first, approachable second. Copy is concise and data-first — every screen leads with the number or the action, and the AI guidance is phrased as calm, specific suggestion rather than hype. There is no emoji, no exclamation marketing, and no first-person brand voice; the product speaks in neutral, imperative labels that assume the user is busy and financially literate.

### Concrete copy examples (lifted from the brand's UI copy samples)

- Dashboard section header: *"Revenue Overview"*
- AI guidance surface: *"AI Assistant"*
- Planning surface: *"Sales Forecast"*
- Liquidity surface: *"Cash Flow"*
- Primary action button: *"Export Report"*

### When generating copy

- Keep labels to two or three words; a section header should fit on one line at caption-to-body size without wrapping.
- Lead with the data: the metric value is the visual anchor, the label recedes to caption size and muted color.
- CTAs use action verbs ("Export Report"); nav items are plain nouns, never slogans.
- No decorative marketing language inside dashboards — words earn their space only by clarifying a number or an action.

## 3. Visual Foundations

### Color

**Brand primary:** `#068a58` (`--ledgerix-primary-600`) — a deep, saturated green that reads as financial growth without veering into corporate cliché. It anchors primary buttons, links, and the CTA, and it is the only color the product trusts with a filled button. The brighter `#14ab6f` (`--ledgerix-primary-500`) is the *accent*: it powers the ring focus state, chart lines, active nav states, the sidebar brand mark, and the left accent rule on AI insight cards. Hover deepens rather than lightens — `#086e49` (`--ledgerix-primary-700`) — which keeps the action surface grounded.

**Brand scale:** a 10-stop ramp from `#e9fbf2` (50, near-white mint washes) through `#14ab6f` (500) to `#0a4934` (900, the dark-green wash used behind the active sidebar item). Light stops appear as success-tinted backgrounds; the deep end handles hover and active fills.

**Neutrals:** a 10-stop slate ramp from `#f8fafc` (50) to `#0f172a` (900). The working neutrals are `#f1f5f9` (100, muted surfaces and hover backgrounds), `#e2e8f0` (200, borders and rules), `#64748b` (500, muted foreground for labels and ticks), `#94a3b8` (400, projected-series gray and dark-mode muted text), and `#0f172a` (900, foreground text and the sidebar field). `#ffffff` is the resting surface and card color.

**Semantic:** success `#0d9488` (teal-green, always on a `#f0fdfa` wash for deltas and paid badges), warning `#d97706` (amber on `#fffbeb` for pending states), error `#dc2626` (red on `#fef2f2` for negative deltas and overdue badges), and info `#2563eb` — a deliberate blue outlier against the green family, reserved for informational UI so it never competes with growth signals.

**Vibe:** vibrant green on near-black/white slate. The palette is a single accent note against a disciplined neutral field — green is reserved exclusively for action and growth, so when you see it, it means "do this" or "this went up." Contrast is pushed hard (`#0f172a` on `#ffffff`), the sidebar is a solid dark block (`#0f172a`), and the dark theme swaps the field to `#0b1220` with surfaces `#131d2e` — the same green voice, dimmer room.

### Typography

**Primary face:** **Urbanist** — a geometric grotesque loaded from Google Fonts in weights 400, 500, 600, 700. It is used for everything: display, headings, and body all resolve to `'Urbanist', sans-serif`, which gives the dashboard a single, confident voice. **JetBrains Mono** (`--font-mono`) handles figures and code.

**Scale:** display 56px at weight 700 with `-0.02em` tracking for the hero number; h1 40px/700, h2 32px/600, h3 24px/600, h4 20px/600 for structure; lead 18px/400 for intro lines; body 16px/400 for the default; caption 12px/400 for labels, ticks, and tags; mono 14px for data figures. The metric-value pattern (h4, 600) over a caption label is the signature data rhythm.

**Line-height:** tight at the top and generous at the bottom — display 1.1, h1 1.2, h2 1.25, h3 1.3, h4 1.4, body 1.6, lead 1.7. Headings feel compact and editorial; reading text breathes. This is the "high-contrast typography" promise: size and weight (600–700 at every heading tier) do the hierarchy work, so color stays free for semantics.

### Spacing

**Base unit is 4px.** Tokens step 4, 8, 12, 16, 24, 32, 48, 64 (`--space-1` through `--space-8`). Padding inside cards and buttons is 16px (space-4); gutters between metric cards are 12px (space-3); nav link groups space at 24px (space-5). Control heights are tokenized for density: buttons are 32px (sm), 40px (md), 48px (lg), inputs 36px, icons 16/20/24px. The cadence keeps a mobile-first dashboard tight enough to scan on a phone and calm enough to live on a desktop.

### Radius

- **4px (`--radius-sm`)** — small controls: sm buttons, card-link hover rounding.
- **6px (`--radius-md`)** — default controls: md buttons, CTAs, sidebar nav items, the brand mark.
- **8px (`--radius-lg`)** — containers: cards, the table shell, the top nav, the sidebar panel, lg buttons.
- **9999px (`--radius-full`)** — pills only: delta chips, status badges, confidence tags, legend dots, avatars.

The set is 4 / 6 / 8 / pill — nothing in between. Geometry stays crisp and intentional; only status markers are allowed to soften into pills.

### Shadow / Elevation

Five layers, all cast in the same neutral slate `rgba(15, 23, 42, …)` — no colored shadows, no brand tint in elevation. Level 1 is the resting card (`0 1px 2px rgba(15,23,42,.06), 0 1px 1px rgba(15,23,42,.04)` — barely there), level 2 lifts on card hover (`0 4px 8px -2px rgba(15,23,42,.10)`), level 3 floats popovers and menus (`0 8px 24px -8px rgba(15,23,42,.18)`), level 4 frames modals (`0 16px 40px -12px rgba(15,23,42,.24)`), level 5 handles overlays (`0 24px 60px -20px rgba(15,23,42,.30)`). The philosophy is whisper-quiet: as elevation grows, blur climbs and spread shrinks, so layers read as depth, never as decoration.

### Borders, Backgrounds

- Borders are hairline `1px` in `#e2e8f0` (`--border`, alias of neutral-200) — on cards, the table shell, the top nav, and as row rules inside tables. The sidebar is the exception: instead of a border, it is a solid `#0f172a` field, so it reads as a recessed surface, not a framed panel.
- Backgrounds layer from white: `#ffffff` surfaces and cards, `#f1f5f9` for muted fills and hover states, `#f8fafc` for low containers. Dark mode replaces the stack with `#0b1220` (background/sidebar) and `#131d2e` (surface/card), with borders softening to `#24334d`.
- In the chart section, `.card` is re-declared with a surface background — a known quirk in `components.css`, not a new pattern.

## 4. Component Patterns

| Component | File | Key Insight |
|---|---|---|
| Button | `preview/component-button.html` | Green carries every conversion point — primary `#068a58` deepens on hover (`#086e49`) instead of lightening, keeping action surfaces grounded; danger is the only saturated exception. |
| Card | `preview/component-card.html` | Metric cards anchor on the value (h4/600) with the label demoted to caption; AI insight cards earn a 4px accent rule on their left edge as a quiet "machine said this" affordance. |
| Table | `preview/component-table.html` | Numeric columns are right-aligned with `tabular-nums` so columns align as columns; row hover is a 3% brightness dip, not a tint — the data stays cool and still. |
| Chart | `preview/component-chart.html` | Actual vs. projected is encoded twice — accent green vs. gray `#94a3b8` *and* solid vs. dashed — so the distinction survives grayscale and color-blind viewing. |
| Navigation | `preview/component-navigation.html` | Two navigations for two mental models: a 60px mobile bottom nav (current item tinted accent via `aria-current`) and a desktop top nav with the brand set in Urbanist display; current page goes foreground-bold, not accent. |
| Sidebar | `preview/component-sidebar.html` | The 240px full and 64px rail variants share one token set; the active item is a dark-green wash (`--ledgerix-primary-900`) behind accent text rather than an inverted pill. |

## 5. Index

- `README.md` — this file: brand narrative, content fundamentals, visual foundations, caveats
- `colors_and_type.css` — single token file: color, typography, spacing, radius, shadow (light + `.dark` scope)
- `components.css` — aggregated component CSS auto-extracted from the preview pages
- `css.json` — structured JSON token representation for programmatic consumption
- `preview/component-{slug}.html` — six small HTML cards illustrating each component live
- `components/index.json` + `components/{slug}.json` — component contracts (variants, states, anatomy)
- `library-consumption.json` — recommended downstream read order for agents
- `SKILL.md` — agent-facing skill manifest

## 6. Caveats / known substitutions

1. **Component variants are inferred**, not extracted: this reconstruction was built from the brand's published case study and common dashboard patterns, so variant/state coverage (e.g., exact button density or table interactions) follows conventions rather than Figma source data.
2. **Token values are AI-generated inference.** The palette and type system were derived from the published case study's signals — Urbanist typeface, a vibrant green primary, neutral black/white/gray — but the exact source hex values are unavailable; treat values like `#068a58` as faithful, not certified.
3. **No icon set is defined.** Use inline SVG or a neutral icon library; the sidebar and nav previews already demonstrate the 20px stroke-based style the brand implies.
4. **Urbanist loads via a Google Fonts `@import`** and the token fallback is a bare `sans-serif`; for offline or production parity, pair it with a similar geometric grotesque before the fallback.
5. **Data integrity warnings:** `component-chart.html` re-declares `.card` (first defined in `component-card.html`), and `component-sidebar.html` lacked extraction markers, so its CSS was captured with a heuristic fallback.
