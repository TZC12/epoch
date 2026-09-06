---
name: ledgerix-design
description: Use this skill to generate well-branded interfaces for Ledgerix. Contains colors, type, fonts, assets, and UI kit for prototyping dashboard UIs.
user-invocable: true
---
# Ledgerix Design Skill

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts, copy assets out and create static HTML files. If working on production code, read the rules here to become an expert in designing with this brand.

## Quick map
- `README.md` — brand context, content fundamentals, visual foundations (read first)
- `colors_and_type.css` — drop-in CSS variables for colors, type, radius, shadow, spacing
- `css.json` — structured token understanding source
- `components.css` — aggregated component CSS extracted from previews
- `components/index.json` — component index + cross-component patterns
- `preview/` — small HTML cards illustrating foundations and components
- `library-consumption.json` — recommended downstream read order
- `components/*.json` — per-component contracts (button, card, table, chart, navigation, sidebar)

## Essentials at a glance
- Primary `#068a58` (ledgerix-primary-600): vivid, confident green on near-black/white neutrals — the single source of brand energy; no warm accents, no default gradients.
- Radius is **4 / 6 / 8** — controls 4px, inputs/CTAs 6px, cards 8px; pills (9999px) only for status chips, delta tags, and avatars, never for cards.
- Density first: 40px default control height (32/40/48 button scale, 36px inputs) on a strict 4px spacing base (4/8/12/16/24/32/48/64).
- Type: **Urbanist** for display, headings, and body (400/600/700); **JetBrains Mono** for figures and code.
- Voice: English, professional, trustworthy, concise financial language — calm numbers, no emoji, no fluff.
- Shadows are whisper-quiet and layered: `shadow-1` `0 1px 2px` for cards at rest, `shadow-3` `0 8px 24px` for floating elements, `shadow-5` `0 24px 60px` only for overlays.
- Signature quirk: AI-first finance dashboard — insight cards with an accent left bar and confidence tags, "Ask AI" navigation, and dashed "projected" lines over solid "actual" chart data.

## Components
| Slug | Name | Key Insight |
|------|------|-------------|
| button | Button | Green-filled primary ("Export Report") with white label; ghost variant reserved for quiet in-chart links; hover deepens to `#086e49`. |
| card | Card | Metric cards pair a caption label with a bold value and a delta pill (+12.4% green / down red); insight cards add an accent left rule and confidence tag. |
| table | Table | Financial rows right-align amounts with tabular-nums and bold totals; status column uses paid/pending/overdue pills, rows dim on hover. |
| chart | Chart | Revenue area/line charts contrast a solid "actual" line in accent green against a dashed gray "projected" forecast line. |
| navigation | Navigation | Mobile-first: a 60px bottom nav (Home/Income/Forecast/Ask AI) on phones; a bordered top nav with brand wordmark and green CTA on desktop. |
| sidebar | Sidebar | Dark `#0f172a` sidebar with green accent active item on deep-green `#0a4934`; ships in 240px full and 64px rail variants. |
