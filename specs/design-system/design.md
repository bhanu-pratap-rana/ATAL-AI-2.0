# Design System — Full Surface Rewrite (Assam / Rural-India Aesthetic)

**Status:** Draft · Awaiting approval
**Owner:** Bhanu Pratap Rana
**Date:** 2026-05-12
**Related:** `apps/web/src/app/globals.css` (Jyoti theme v4), `apps/web/public/assets/logo.png`

## Vision in one line

**A modern, joyful, culturally-rooted educational platform that feels made-for-Assam — not a translated cousin of an American ed-tech app.**

## Audience

- **Primary:** Class 6–12 students in rural Assam, often on mid-tier Android phones, often switching between Assamese, Hindi, and English.
- **Secondary:** Their teachers — government-school teachers comfortable with WhatsApp but not power-users of complex dashboards.
- **Tertiary:** State / district administrators — desktop-first, want fast read-only insights.

## Identity Anchors

### Logo decoded
The current logo (orange robot with a rainbow halo, sitting on an open book with a glowing lightbulb, framed by Assamese-style swirls):

- **Orange robot mascot** → friendly, approachable AI tutor. Keep as central character.
- **Rainbow halo** → joy of learning, inclusivity, multiple subjects.
- **Open book + lightbulb** → traditional education + the spark of curiosity.
- **Swirls at the base** → reads as **Muga silk motifs** / Brahmaputra wave patterns. Anchor for our ornamental flourishes.

### Cultural references we lean into
- **Muga silk** (golden Assamese silk) — for premium / achievement moments (badges, completion screens, leaderboard top-3).
- **Bihu / Gamosa** (the red-and-white striped cotton towel) — for milestone celebrations and seasonal themes.
- **Brahmaputra** (the river that defines the state) — flowing curves, blue gradients, "progress as a river" metaphor.
- **One-horned rhinoceros / Kaziranga** — sparingly, for "explorer" / discovery moments. Risk: easy to caricature; use stylized SVG, not photo.
- **Tea garden green** — secondary background tone, evokes Assam's hill plantations.

### Cultural references we avoid
- Stereotypical "Indian" gold-and-red Bollywood palettes — wrong region.
- North-India-coded motifs (paisley, peacock prominence) — Assam is in the Northeast.
- Religious imagery of any kind.

## Color System v5

### Core palette
| Token | Hex | Source | Use |
|---|---|---|---|
| `--brand-primary` | `#F98819` | logo orange | CTAs, active nav, primary buttons |
| `--brand-secondary` | `#24B0D7` | logo cyan | Info, links, voice features |
| `--brand-muga` | `#D4A24C` | Muga silk gold | Achievement, badges, leaderboard #1–3, premium |
| `--brand-brahmaputra` | `#3B82F6` → `#0EA5E9` (gradient) | river blue | Teacher portal, progress, calm |
| `--brand-bihu-red` | `#DC2626` | Gamosa stripe | Admin portal, alerts, celebrations |
| `--brand-tea-garden` | `#52946C` | tea green | Secondary buttons, "growth" semantic |
| `--brand-bamboo` | `#A8845C` | bamboo wood | Neutral warm — alternative to grey for cards |

### Neutrals (warmer than Slate)
- `--neutral-50` `#FBF7F1` — surface (warm off-white, not stark white)
- `--neutral-100` `#F1ECE3`
- `--neutral-200` `#E2DACB`
- `--neutral-700` `#3D3528` — primary text (warm dark brown, not pure black)
- `--neutral-900` `#1F1A12`

### Dark mode
First-class. Background `#1A1410` (warm dark brown, evokes terracotta and night), foreground `--neutral-100`. Brand colors stay; we adjust luminance via a separate `--brand-primary-dark-mode: #FF9F33`.

## Typography

| Role | Family | Why |
|---|---|---|
| **Headings (latin + display)** | `Sora` (Google) | Geometric, modern, friendly. Pairs with Assamese script gracefully. |
| **Body (latin)** | `Inter` | Workhorse. Already a Tailwind default — easy migration. |
| **Body (Assamese / Bengali script)** | `Noto Sans Bengali` | Official Google Noto for Assamese/Bengali. High-quality rendering on Android. |
| **Body (Devanagari)** | `Noto Sans Devanagari` | Same family, same metrics. |
| **Display / numeric (scores, streak)** | `Sora` variable | Used at 700–800 weight for big stats |

Scale (modular, ratio 1.25 — major third):
- `text-xs` 0.75rem · `text-sm` 0.875rem · `text-base` 1rem · `text-lg` 1.125rem · `text-xl` 1.25rem · `text-2xl` 1.5rem · `text-3xl` 1.875rem · `text-4xl` 2.25rem · `text-5xl` 3rem · `text-6xl` 3.75rem.

Loaded via `next/font/google` with `display: 'swap'` and subset to Latin + Bengali + Devanagari.

## Iconography

- **Primary:** [Lucide](https://lucide.dev) (already in use). Stroke width 2 base, 2.5 for emphasis.
- **Cultural set:** custom SVG icons we build incrementally: muga-silk-skein, gamosa-stripe, brahmaputra-curve, rhino, tea-leaf, fish (a Brahmaputra fish for "catch of the day" daily-question metaphor).
- **Mascot illustrations:** Reuse / extend the logo robot for empty states, onboarding, celebrations. Source SVGs from the same designer.

## Motion & Animation

Library: [**Motion** (`motion`)](https://motion.dev) — the formerly-named `framer-motion`. Reasons:
- Tiny tree-shakable bundle (vs `framer-motion`'s ~100 KB).
- Spring-based physics by default — feel natural on rural-mid-Android devices.
- Works well with React Server Components.

### Motion patterns

| Pattern | Where | Duration |
|---|---|---|
| **Spring fade-in** | All page-transitions / route enters | 320ms `bounce: 0.25` |
| **Scale-95 tap** | Every button (already in code via `active:scale-95`) | instantaneous |
| **Stagger reveal** | Lists, leaderboards, module grids | 60ms stagger, 280ms each |
| **Confetti** | Lesson completion, assessment ≥80%, badge unlock | 1.4s |
| **Mascot wave** | Empty states + onboarding | loop, 4s |
| **Progress ring fill** | Module / topic progress | 800ms ease-out |
| **Streak flame** | Day-streak counter (Bihu fire metaphor) | continuous breathing, 2s loop |
| **Muga silk shimmer** | Earned badge cards | linear shimmer on hover, 1.6s |
| **Brahmaputra wave** | Loading state for any "fetching progress" call | flowing 2-color gradient, 3s loop |

### Performance budgets
- First-contentful-paint **< 1.5s on Moto G Power-class device**.
- Total animation JS bundle **< 50 KB gzipped**.
- Disable all animations when `prefers-reduced-motion: reduce` — non-negotiable a11y rule.

## Components Inventory

| Component | New variants needed | Animation |
|---|---|---|
| Button | primary / secondary / muga (achievement) / ghost / destructive | scale-95 tap |
| Card | elevated / outlined / muga-shimmer (badge) / brahmaputra (progress) | hover lift |
| Badge | role-tag, score-pill, status-dot, achievement-medal | shimmer on achievement |
| Modal / Dialog | center / bottom-sheet (mobile) / drawer (tablet+) | spring slide + Escape close |
| Toast | success / warning / error / info / streak-celebration | slide-up, dwell, fade |
| Progress | linear / ring / module-river (Brahmaputra-curve SVG) | fill 800ms |
| Avatar | student initials / teacher photo / mascot robot | none |
| Confetti | celebration overlay | 1.4s emit |
| Mascot | hero / inline / loading / empty-state | wave / breathe |
| BottomNav | mobile tab bar | Active-pill spring |
| Header | role-aware (uses fix from U1) | none |
| Lesson cards | concept / quiz / video / interactive / story | hover lift |
| Streak counter | flame icon + day count | breathing flame |
| Class card | with teacher avatar + subject swirl | hover lift |

## Sound (optional, low priority)

If we ever ship audio cues:
- **Lesson complete:** Bihu dhol single beat (royalty-free sample, < 8 kB).
- **Wrong answer:** soft "tsk" — neutral, not punishing.
- **Streak day:** quick flute trill (Assamese pepa, royalty-free).
- All muted by default. Settings toggle to enable.

## Pages to Refactor (Full Surface Rewrite)

### Phase A — foundation (no per-page rewrite yet)
1. Replace `globals.css` token block with v5 palette + dark-mode block.
2. Add `next/font` loads for Sora + Noto Sans Bengali + Devanagari.
3. Install Motion. Create `apps/web/src/lib/motion/` with shared variants (`fadeIn`, `stagger`, `shimmer`, `wave`).
4. Create `apps/web/src/components/system/` for the new component primitives (Button, Card, Badge, etc.).
5. Storybook-lite preview page at `/ui-preview` (already exists — extend it).

### Phase B — anchor screens
1. **`/student/start`** (the first thing a student sees) — full redesign with mascot hero.
2. **`/app/student/dashboard`** — module grid, streak, badges, leaderboard.
3. **`/app/learn`** — module list with Brahmaputra-river progress visualization.
4. **`/app/learn/[m]/[t]`** lesson player — concept / quiz / story variants.

### Phase C — supporting screens
5. `/app/teacher/dashboard` + analytics
6. `/app/teacher/classes`
7. `/admin/dashboard` + drill-in modals
8. `/admin/pins`, `/admin/admins`, `/admin/features`, `/admin/questions`, `/admin/setup`, `/admin/manage`
9. `/app/settings`, `/app/ai-tools`, `/app/student/classes`, `/app/student/assessments`, `/app/progress`

### Phase D — polish
10. Confetti + Bihu-themed celebrations on milestone events.
11. Brahmaputra-curve module-progress SVG.
12. Mascot animations for empty states.

## Rollout

Each phase A item is a separate PR. Phase B and C items are one PR per screen. Estimated **18–22 PRs total** to finish full surface rewrite.

We do not switch the whole site at once — instead, the design system lives behind tokens. Each refactored screen consumes new tokens; un-refactored screens still consume the old `--color-primary` etc. (we keep the old token names as aliases). At any point we can ship a partial rewrite.

## Non-Goals

- We do **not** redesign the database schema, RPCs, or auth flows.
- We do **not** add new features (e.g. video lessons, voice chat) — that's a product decision separate from this design system.
- We do **not** support IE/legacy browsers — modern Chromium / Safari / Firefox only.

## Acceptance Criteria

- All design tokens defined in `globals.css` and consumed by at least one screen.
- Mascot character appears on at least 3 screens (login, dashboard, empty-state).
- Dark mode toggle works on every refactored screen.
- Lighthouse Mobile score ≥ 90 on the redesigned `/app/student/dashboard`.
- All EN / HI / AS strings render in the new typography without clipping.
- No Tailwind class regressions in `rule.md` audit (no hex colors in JSX).

## Open Questions

- **Q1.** Do we want the orange-mascot character on every page (a la Duolingo's owl) or only on celebratory moments?
- **Q2.** Should the Bihu-red admin gradient stay (current code) or shift to a softer muga-gold for less aggressive feel?
- **Q3.** Do we ship dark mode in Phase A or defer it? (Recommendation: Phase A — tokens are cheap, but dark-mode QA per screen takes time.)
- **Q4.** Sound — yes/no/later?
