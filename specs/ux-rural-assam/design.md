# UX for Rural Assam — Design Spec

**Status:** Draft from audit · Awaiting review
**Date:** 2026-05-12
**Audience:** rural-Assam students (class 6-12), their teachers, district admins
**Inputs:** UX deep-dive agent audit (12 findings + top-10 fixes)

## Audience profile (recap)

- **Student:** age 11-17, government school, mid-tier Android (4-6 GB RAM, 720p), intermittent 4G/3G, often Assamese-only or Assamese+Hindi; shared device with siblings/parents; battery anxiety.
- **Teacher:** govt school teacher (30-55); comfortable with WhatsApp; might use desktop in school + phone at home; unreliable internet.
- **Admin:** state/district admin; desktop-first; English-comfortable; high-density data.

## Findings (audit-numbered, severity-ranked)

| # | Finding | Severity | File / location |
|---|---|---|---|
| UX-A1 | Radio buttons in `AssessmentRunner` are 24×24px → below WCAG 2.5.5 (44×44). Touchscreen wear in rural schools = mis-taps. | HIGH | `components/assessment/AssessmentRunner.tsx` |
| UX-A2 | Error toasts use English jargon ("Unauthorized", "Rate limit exceeded"); no plain-language fallback. | HIGH | `api/tutor/chat/route.ts` + others |
| UX-A3 | Empty states default to English even when user selected Assamese. Language toggle is UI-only — doesn't cascade to all chrome. | HIGH | `components/ui/empty-state.tsx` + 8 other places |
| UX-A4 | Assessment pagination uses color alone (✓/✗/○). No aria-label, no text label. Color-blind students and bright-sunlight viewing both fail. | MED | `AssessmentRunner.tsx:670` |
| UX-A5 | Voice input transcribes to Romanized text (not Assamese script); silent mismatches break tutor context. | HIGH | `app/app/ai-tools/tutor/page.tsx` |
| UX-A6 | Offline lesson cache expires silently after 7 days — no UI warning. Sync after reconnect is background-silent. | HIGH | `lib/offline/lesson-cache.ts` |
| UX-A7 | Sign-up assumes student has own email/phone; rural students typically use parent's phone. No parent co-verification or session isolation on shared devices. | HIGH | `components/auth/student/SignUpStep.tsx` |
| UX-A8 | Assessment lacks an "I don't understand this question" / "simpler please" affordance. IRT theta can't distinguish English barrier from math gap. | HIGH | `AssessmentRunner.tsx` |
| UX-A9 | AI tutor visible-message limit (20) hides older conversation. No "load earlier" CTA. Students re-ask same questions, burn rate-limit budget. | MED | `app/app/ai-tools/tutor/page.tsx` |
| UX-A10 | Suggested questions on tutor are English-only; doesn't honor selected language. No curriculum-specific local examples. | MED | `app/app/ai-tools/tutor/page.tsx` |
| UX-A11 | Loading states show generic "Loading..." not content skeletons. On 3G, students assume the app crashed. | HIGH | `components/learn/EmptyModulesMessage.tsx` + others |
| UX-A12 | Rate-limit 429 returns string only — no `Retry-After` countdown, no UI button. | MED | `api/tutor/chat/route.ts` |

## Top-10 fixes ranked by rural-Assam student impact

1. **Plain-language, translated error messages** (UX-A2) — replace "Unauthorized" / "Rate limit" with `t('errors.…')`.
2. **44×44 touch targets** (UX-A1) — bump radio + nav buttons to `min-h-11 min-w-11`.
3. **Default to Assamese for likely-rural users; cascade through every i18n key** (UX-A3, UX-A10) — auto-detect from device locale, persist in cookie.
4. **"I don't understand this question" button** (UX-A8) — surfaces a simplification request to the AI tutor, marks the IRT response as language-barrier-flagged (not wrong).
5. **Sync-status badge after offline work** (UX-A6) — "Your progress was saved" or "Will sync when online" with explicit feedback.
6. **Skeleton loaders for all content** (UX-A11) — already partially exists in some pages; extend to all routes (overlaps with SP3 of master plan).
7. **Rate-limit error boundary with countdown + auto-retry** (UX-A12) — surface a `<RateLimitError retryAfter={30} />`.
8. **"Load Earlier Messages" in AI tutor** (UX-A9) — pagination affordance for hidden history.
9. **Parent co-verification on shared-device sign-up** (UX-A7) — optional parent phone OTP for users under 18.
10. **Assamese-first suggested questions + local curriculum examples** (UX-A10) — load from `t('tutor.suggested.${language}')`.

## Cultural design alignments (separate from bug fixes — these inform SP7 design system v5)

- **Mascot delight moments:** show the orange robot mascot on every empty state, with a contextual line ("আজি কি শিকিম?" / "What shall we learn today?").
- **Bihu celebration:** milestone events (first lesson, 7-day streak, 100% on assessment) trigger a Bihu-dhol single beat + Gamosa-stripe confetti.
- **Brahmaputra-river progress:** module progress visualized as a flowing river with stones as topics — replaces the generic linear progress bar.
- **Muga-silk badges:** "achievement" cards use the golden Muga-silk shimmer instead of plain gold gradient.

## Acceptance criteria

- [ ] Every error toast has an i18n key, not a raw English string.
- [ ] Every interactive element on a student-facing screen is ≥ 44 × 44 px.
- [ ] Selecting Assamese on `/student/start` makes every subsequent screen render in Assamese (zero English fall-through).
- [ ] Submitting an assessment offline shows a "Saved offline, will sync" confirmation; clicking the sync icon reveals queued items.
- [ ] The AI tutor shows a "I don't understand" CTA on every question; clicking it sends a simplification request and marks the IRT response correctly.
- [ ] Lesson cache expiry is surfaced to the user 24h in advance.
- [ ] Rate-limit errors show a countdown timer with auto-retry.
- [ ] Shared-device sign-out fully clears local IndexedDB / Cache Storage.

## Tasks merged into master plan (SP6)

Folded as **SP6 — Rural-Assam UX fixes** in [`docs/superpowers/plans/2026-05-12-master-execution-plan.md`](../../docs/superpowers/plans/2026-05-12-master-execution-plan.md). 7-10 PRs covering the top-10 fixes.
