# P3 — Design System Rewrite (Assam / Rural-India Aesthetic)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current visual layer with a culturally-rooted modern design system (Assam / rural-India aesthetic) and refactor every `/app/*` page to consume it.

**Architecture:** Token-first. New v5 palette + typography + motion library land first as design tokens. Old token names stay as aliases so un-refactored screens keep working. Each subsequent PR refactors one screen.

**Tech Stack:** Tailwind v4, CSS variables, `motion` (formerly framer-motion), `next/font/google` (Sora + Noto Sans Bengali + Devanagari), Lucide icons, custom SVG mascot + cultural assets.

**Spec:** [`specs/design-system/design.md`](../../../specs/design-system/design.md)

---

## Phase A — Foundation (4 PRs)

### Task A1 — Install Motion + define shared variants

**Files:**
- Modify: `apps/web/package.json` (add `motion`)
- Create: `apps/web/src/lib/motion/variants.ts` (shared spring presets)
- Create: `apps/web/src/lib/motion/index.ts` (re-export)

- [ ] **Step 1: install dependency**

```bash
cd apps/web && npm install motion
```

- [ ] **Step 2: create shared variants**

```typescript
// apps/web/src/lib/motion/variants.ts
import type { Variants } from "motion/react";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.25, duration: 0.32 } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const muga: Variants = {
  rest: { backgroundPosition: "0% 50%" },
  shimmer: {
    backgroundPosition: "200% 50%",
    transition: { duration: 1.6, repeat: Infinity, ease: "linear" },
  },
};

export const brahmaputra: Variants = {
  flow: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

export const respectReducedMotion = (variant: Variants): Variants => {
  // Caller wraps with the useReducedMotion hook
  return variant;
};
```

- [ ] **Step 3: write smoke test that the export shape is stable**

`apps/web/__tests__/motion-variants.test.ts` — just asserts the exports exist and have `hidden`/`visible` keys. No DOM needed.

- [ ] **Step 4: commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/lib/motion __tests__/motion-variants.test.ts
git commit -m "feat(design): add motion library + shared spring variants"
```

---

### Task A2 — Token palette v5 + dark mode

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: add v5 tokens above the existing `:root` block**

```css
:root {
  /* Brand v5 — Assam / rural-India palette */
  --brand-primary: #F98819;        /* logo orange */
  --brand-secondary: #24B0D7;      /* logo cyan */
  --brand-muga: #D4A24C;           /* Muga silk gold */
  --brand-brahmaputra-1: #3B82F6;
  --brand-brahmaputra-2: #0EA5E9;
  --brand-bihu-red: #DC2626;
  --brand-tea-garden: #52946C;
  --brand-bamboo: #A8845C;

  /* Warm neutrals */
  --neutral-50: #FBF7F1;
  --neutral-100: #F1ECE3;
  --neutral-200: #E2DACB;
  --neutral-300: #C7BBA4;
  --neutral-700: #3D3528;
  --neutral-900: #1F1A12;

  /* Aliases for backward compat — old token names keep working */
  --color-primary: var(--brand-primary);
  --color-cyan: var(--brand-secondary);
}

@media (prefers-color-scheme: dark) {
  :root {
    --brand-primary: #FF9F33;
    --neutral-50: #1A1410;
    --neutral-100: #2A2018;
    --neutral-700: #E2DACB;
    --neutral-900: #F1ECE3;
    /* etc. */
  }
}

[data-theme="dark"] {
  /* Same as @media block — for manual toggle */
}
```

- [ ] **Step 2: smoke**

Run the dev server → visit `/student/start` → no visible regression (because aliases preserve old behavior).

- [ ] **Step 3: commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(design): introduce v5 brand tokens + warm neutrals + dark-mode variables"
```

---

### Task A3 — Next/font loads (Sora + Noto Sans Bengali + Devanagari)

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css` (font-family CSS vars)

- [ ] Add `import { Sora, Inter, Noto_Sans_Bengali, Noto_Sans_Devanagari } from "next/font/google";`
- [ ] Configure each with `display: "swap"` and the right `subsets`.
- [ ] Apply font CSS variables on the `<html>` element.
- [ ] Map to Tailwind via `@theme` block in `globals.css`.
- [ ] Smoke walk: page renders new typeface; Assamese/Hindi text crisp on mobile.
- [ ] Commit.

---

### Task A4 — System component primitives (`apps/web/src/components/system/`)

**Files:**
- Create: `apps/web/src/components/system/Button.tsx`
- Create: `apps/web/src/components/system/Card.tsx`
- Create: `apps/web/src/components/system/Badge.tsx`
- Create: `apps/web/src/components/system/Mascot.tsx` (renders the logo robot inline)
- Create: `apps/web/src/components/system/StreakFlame.tsx`
- Create: `apps/web/src/components/system/MugaCard.tsx` (achievement variant)

- [ ] Each component consumes v5 tokens, accepts a `motion` prop to opt into the spring entrance.
- [ ] Extend `/ui-preview` page to render all primitives.
- [ ] Add visual snapshot tests for each via Playwright `expect(page).toHaveScreenshot()`.
- [ ] Commit per component (3-4 small PRs is fine here).

---

## Phase B — Anchor screens (4 PRs)

### Task B1 — `/student/start` refresh

Tasks:
- [ ] Hero section with **Mascot** centered, gentle bob animation.
- [ ] Three role tiles (Student / Teacher / Admin) with new `Card` variant — orange / brahmaputra / bihu-red.
- [ ] Existing form preserved, restyled via new `Button` and `Input`.
- [ ] Confetti on successful login.
- [ ] Mobile-first responsive at 375 / 768 / 1280.
- [ ] Lighthouse Mobile ≥ 90.
- [ ] Visual diff against `/ui-preview` baseline.
- [ ] Commit.

### Task B2 — `/app/student/dashboard` refresh

Tasks:
- [ ] Banner with `Mascot` + welcome string + streak (StreakFlame).
- [ ] Stat cards (4): Classes / Assessments / Streak / Avg Score.
- [ ] Module grid using `MugaCard` for completed, default `Card` for in-progress, locked variant for not-yet-unlocked.
- [ ] Leaderboard restyled with rank medals (#1 gold = muga, #2 silver, #3 bronze).
- [ ] Stagger reveal on initial load.
- [ ] Dark-mode QA.
- [ ] Commit.

### Task B3 — `/app/learn` refresh

Tasks:
- [ ] Module list with **Brahmaputra-curve SVG** as progress visualization (river flows left-to-right; topics are stones along the river).
- [ ] AI recommendation section.
- [ ] Module cards with the rainbow halo treatment (subtle).
- [ ] Commit.

### Task B4 — Lesson player refresh

Tasks:
- [ ] Concept page: hero illustration (custom SVG per topic, fallback Mascot).
- [ ] Quiz page: friendlier "wrong answer" state — no red, just orange + gentle dhol sound (optional).
- [ ] Story / interactive variants visually distinct.
- [ ] Next/Previous as muga-gold and brahmaputra-blue.
- [ ] Completion: confetti + Mascot celebration variant.
- [ ] Commit.

---

## Phase C — Supporting screens (one PR each)

- [ ] C1: `/app/teacher/dashboard`
- [ ] C2: `/app/teacher/analytics/questions`
- [ ] C3: `/app/teacher/classes`
- [ ] C4: `/admin/dashboard`
- [ ] C5: `/admin/pins`, `/admin/admins`, `/admin/features`, `/admin/questions`, `/admin/setup`, `/admin/manage` (each its own PR if they diverge; combined if shared layout)
- [ ] C6: `/app/settings`
- [ ] C7: `/app/ai-tools`
- [ ] C8: `/app/student/classes`
- [ ] C9: `/app/student/assessments`
- [ ] C10: `/app/progress`
- [ ] C11: `/join`, `/offline`, `/reset-password` (auth-adjacent screens)

Each follows the same pattern: replace old token usages, plug in motion variants, add the appropriate mascot/cultural touch, dark-mode QA, Lighthouse check, screenshot baseline.

---

## Phase D — Polish (2-3 PRs)

- [ ] D1: Confetti library wiring + lesson-completion celebration.
- [ ] D2: Bihu-themed seasonal banner (mid-April Bihu festival).
- [ ] D3: Mascot animations for empty states across all "no X yet" screens.

---

## Self-Review Checklist (every PR)

- [ ] Lighthouse Mobile ≥ 90 on the touched page.
- [ ] Touches only one screen (or one component set).
- [ ] PR diff ≤ 500 LOC.
- [ ] No hex colors in JSX — all consumed via CSS variables.
- [ ] `prefers-reduced-motion` honored (animations skipped, not just slowed).
- [ ] EN / HI / AS strings render without clipping at every breakpoint.
- [ ] Dark mode toggled on/off — no broken contrast.
- [ ] Mascot file size ≤ 30 KB (SVG).

## Performance Budgets

- First-contentful-paint **< 1.5s on Moto G Power-class device** (3G throttling).
- Animation JS bundle **< 50 KB gzipped**.
- Each component's motion variant **must** skip on `prefers-reduced-motion`.

## Execution Handoff

Per user's choice: **plan-first, ask before each PR**. After this plan is approved, the first executable PR is **A1 (install motion + variants)**. Pause for review before A2.

## Open questions for the user before implementation starts

1. **Should I include sound** (Bihu dhol, pepa flute) in Phase D, or skip entirely?
2. **Mascot per-page** — show on every page or only on celebratory / empty-state moments?
3. **Bihu-red admin gradient** — keep current, or shift to muga-gold for a softer admin feel?
4. **Dark mode in Phase A** vs deferred to a separate phase?
5. **Confirm the chosen Google Fonts** (Sora + Inter + Noto Sans Bengali + Noto Sans Devanagari) — any preferences?
6. **OK to install `motion` as a runtime dep** (~10 KB gzip), or constraint to bundle-size limit?
