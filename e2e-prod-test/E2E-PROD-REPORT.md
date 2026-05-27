# ATAL AI Production E2E Test Report

**Target:** https://www.atalai.co.in/
**Date:** 2026-05-27
**Method:** Playwright MCP (live Chromium) + direct Supabase SQL inspection
**Demo accounts used:** `demo.student@atal.com`, `demo.teacher@atal.com`, `demo.admin@atal.com`

## TL;DR

29 findings across 5 phases. **6 P0 blockers** (assessment scoring is mathematically wrong, lesson images have gibberish labels that will mis-teach students, "I don't understand this question" button silently skips). **9 P1 issues** (AI-tutor first-char strip, teacher analytics doesn't show student data, IRT mislabeled, robots/sitemap 404). The site is functional end-to-end for all 3 roles, but the assessment and lesson-content pipelines have data-integrity bugs that block production rollout.

| Severity | Count |
|---|---|
| P0 — blocks launch | 6 |
| P1 — must fix soon | 9 |
| P2 — should fix | 10 |
| P3 — nice to have | 4 |
| **Total** | **29** |

---

## P0 — Blockers (must fix before any real student uses this)

### F-DATA-02 — Assessment score formula is wrong
**Where:** `/app/assessment/summary`
**Evidence:** I answered 1 of 30 questions (skipped 29). The UI showed:
- 100% Overall Score
- 1/1 Correct Answers
- "Excellent! Advanced"

**Database query:**
```sql
SELECT COUNT(*) FROM assessment_responses
WHERE session_id = 'ceb18cd8-101e-4a0e-a902-0f4957526605';
-- returns: 1
```

**Root cause:** Score% = `COUNT(correct) ÷ COUNT(answered)`. Denominator should be total questions in the session (30), not answered (1).

**Fix:** Store `total_questions` on `assessment_sessions`. Compute `score = correct ÷ total_questions`. Unanswered = wrong (or 0 credit).

---

### F-DATA-01 — Skipped questions not persisted
**Evidence:** 29 skipped questions left **zero rows** in `assessment_responses`. There is no `is_skipped` column and no NULL-chosen row inserted. Skip behavior is silently lossy.

**Fix:** On Skip click, either insert a row with `is_correct=false, chosen_option=NULL`, OR add an `is_skipped boolean` to `assessment_responses`. Pick one and ship it.

---

### F-DATA-03 — IRT ability shown as confident "Advanced" with ±22.53 standard error
**Evidence:** Single answer → IRT θ=4.00 ±22.53. Standard error of 22.53 means there is effectively no information. UI labels it "Advanced" anyway.

**Fix:** Suppress the IRT panel when SE > 1.0. Show "Answer more questions to estimate skill level" instead.

---

### F-LESS-01 — Lesson illustration images contain gibberish labels
**Evidence:** M1/T1.2 image labels: "CP", "CV", "Sealer", "Muster" (in place of CPU, Mouse, Keyboard, Speaker, Screen). Multiple chunks show the same garbled diagram. AI image generators cannot render legible text inside diagrams.

**Why P0:** This is an *educational* product. A student learning that "the CPU is called CP and the mouse is called Muster" will fail real-world tasks. The credibility hit is severe.

**Fix:**
- Stop generating labeled diagrams via image models
- Curate a small library of correct, free-licensed illustrations
- OR render labels in HTML/SVG overlay on top of an unlabeled illustration

---

### F-LESS-02 — Image generation prompt leaked into UI as caption + alt text
**Evidence:** Below each lesson image, the visible "caption" is the LLM image prompt:
> "A simple diagram of a desktop computer showing a monitor, keyboard, mouse, and CPU tower. A question mark hovers over the monitor, indicating a quiz question related to it."

The same string is also the `<img alt>` (200+ chars long — terrible for screen readers).

**Fix:** Separate schema fields: `image_prompt` (for generation, never displayed) + `image_caption` (short student-facing) + `image_alt` (≤80 chars). Display `image_caption`, use `image_alt` for accessibility.

---

### F-PROD-AS01 — "I don't understand this question" button silently skips
**Evidence:** Button labeled `🤔 I don't understand this question` is wired to the same handler as Skip. No AI help opens. No translation. No rephrase. No confirmation. The question is silently marked skipped.

**Why P0:** It's a UX promise the app doesn't keep. Students who click it expecting help instead lose the question and have no idea why.

**Fix:** Either build the feature (open inline AI Tutor with question as context, in student's language) OR rename the button to its actual behavior. Don't ship the deceptive label.

---

## P1 — Must fix soon

### F-PROD-AI01 — AI tutor response missing first character
**Evidence:** Asked "What is a CPU and why is it important?" → response started with "antastic question..." (should be "Fantastic question..."). Streaming or render bug eats the first 1–2 chars.

**Fix:** Inspect the streaming chunk-decoder. Likely a partial UTF-8 boundary or `slice(1)` somewhere.

---

### F-PROD-TCH01 — Teacher dashboard shows "No AI tutor interactions yet" when 2 exist
**Evidence:** Demo student has 2 rows in `ai_tutor_interactions` table. Teacher dashboard + class detail both show empty state.
```sql
SELECT COUNT(*) FROM ai_tutor_interactions WHERE student_id = '11111111-1111-1111-1111-111111111111';
-- returns: 2
```
**Likely cause:** RLS policy doesn't allow teacher to read interactions of enrolled students, OR the dashboard query is filtered wrong.

**Fix:** Add an RLS policy `(EXISTS SELECT 1 FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = ai_tutor_interactions.student_id AND c.teacher_id = auth.uid())`.

---

### F-PROD-TCH03 — Teacher assessments page shows 0 total assessments, "-" average
**Evidence:** Demo student has 2 completed assessment sessions (DB confirms). Teacher's "Assessments" page shows 0 Total Assessments, "-" Average Score.

**Fix:** Same RLS / query issue as F-PROD-TCH01. Teacher reads of `assessment_sessions` need to be scoped to enrolled-students.

---

### F-LESS-03 — Lesson image too small
**Evidence:** Image rendered at intrinsic 512×512 inside a padded card. On mobile it's small relative to its educational importance.

**Fix:** Full-width within content area (max-w 900px), 4:3 aspect ratio, click-to-zoom on tap.

---

### F-LESS-04 — Two language switchers on lesson screen
**Evidence:** Header has a combobox `[🇬🇧 English ▼]`. Lesson page also has a 3-pill row `[🇬🇧 English] [🇮🇳 हिंदी] [🏔️ অসমীয়া]`. Same function, two controls, confusing.

**Fix:** Remove the pill row (header combobox is sufficient and consistent across pages).

---

### F-PROD-001 / 002 — robots.txt and sitemap.xml return 404 (HTML body)
**Evidence:**
```
GET /robots.txt → 404 text/html
GET /sitemap.xml → 404 text/html
```
Crawlers expect `text/plain` and `application/xml` respectively. Currently the SPA fallback serves the landing-page HTML.

**Fix:** Add `app/robots.ts` and `app/sitemap.ts` (Next.js native helpers). Even a minimal `User-agent: * / Disallow:` is better than 404.

---

### F-PROD-003 — Redis not configured on production
**Evidence:** `/api/health` returns `"redis":{"status":"skipped"}`. Rate-limiter falls back to in-memory which is per-Vercel-lambda — distributed limiting is broken.

**Fix:** Provision Upstash Redis (free tier), set `REDIS_URL` + `REDIS_PASSWORD` env vars in Vercel.

---

### F-LESS-08 — Next button enabled on QUIZ chunks without answer
**Evidence:** On a quiz chunk you can click Next without ever selecting an option or clicking Check Answer. The chunk is treated as advanced but no answer was recorded.

**Fix:** Disable Next on quiz chunks until `Check Answer` has been pressed (and the answer recorded). Or merge Next + Check into a single "Submit & Continue".

---

### F-PROD-AD01 / AD02 — `/admin/pins` uses old slate chrome, no admin nav
**Evidence:** The school-PIN admin tool is on a separate `/admin/*` tree (no `/app` prefix) using the pre-bento design. Inconsistent with the rest of the product.

**Fix:** Move into `/app/admin/pins` with the bento chrome, surface it in the admin nav.

---

## P2 — Should fix

| ID | Where | Issue |
|---|---|---|
| F-PROD-004 | Landing HTML | No Open Graph (`og:title`, `og:image`, `og:description`, `og:url`) — bad social previews |
| F-PROD-005 | Landing HTML | No Twitter Card meta tags |
| F-LESS-05 | Lesson body | Body text ~14px on mobile — too small for rural-student audience |
| F-LESS-06 | Lesson player | Progress dots use color-only encoding (green/orange/grey). Add chunk-type icon inside each dot |
| F-LESS-07 | Quiz options | Double space between letter and label: `"A.  The Monitor"` |
| F-PROD-AS03 | Final quiz button | Visible "Complete Assessment" text but `aria-label="Go to next question"` — mismatch confuses screen readers |
| F-PROD-AS06 | Summary page | "Areas to Improve" shows same category as "Your Strengths" when only 1 category answered |
| F-PROD-PROG01 | Progress page | Module names shown as snake_case (`internet_web_awareness`). Humanize: "Internet & Web Awareness" |
| F-PROD-SET01 | Settings page | User UUID displayed publicly to student — should be hidden or "Show for support" |
| F-PROD-SET03 | Settings page | "Assessment Reminders: Not Set" with no toggle to actually set it |

---

## P3 — Nice to have

| ID | Where | Issue |
|---|---|---|
| F-PROD-006 | Landing HTML | Server returns `<meta robots noindex>` but JS removes it after hydration — fine if intentional, but verify |
| F-PROD-007 | Module list | Module 1 shows Assamese subtitle when language is English (bilingual display, may be intentional) |
| F-PROD-008 | Recommendations | AI recommendation links to a locked module (M2/T4.1) |
| F-LESS-09 | Header | "Student Portal — ATAL AI SYSTEM" all-caps feels cold/institutional |

---

## Cross-cutting findings

### Security headers — ✅ Good
```
Content-Security-Policy: present, scoped
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: scoped (mic allowed for self, camera/geo blocked)
```
No issues.

### Authorization boundaries — ⚠️ Mostly OK
| From → To | Result |
|---|---|
| Anonymous → `/app/*` | Client-side gate redirects to login ✅ |
| Student → `/app/admin/*` | Redirected to `/admin/login` ✅ |
| Student → `/app/teacher/*` | Redirected to student dashboard ✅ |
| Admin → `/app/teacher/dashboard` | Allowed, shows empty teacher state with mixed Admin chrome ⚠️ |

The admin-views-teacher-route case isn't a security hole (admin sees their own empty state, not other teachers' data), but the UX is confused: "Admin Portal" header + Teacher nav + "Create your first class". Either deny or impersonate properly with a chrome banner.

### Performance — Acceptable
- `/api/health` db latency: **761 ms** (a bit high — consider connection pooling tweak)
- Landing page LCP: **good** (cached HTML hit on Vercel edge)
- No layout shift observed on dashboard, lesson, assessment summary

### Browser console — Clean
Only error during entire session: the deliberate 400 on the wrong-password attempt. No uncaught exceptions on any flow.

---

## What works well (positives — keep)

- ✅ Auth flow (3 sign-in methods, password-strength UI, error messages, sign-out)
- ✅ Lesson completion modal — `role=dialog`, `aria-modal`, `aria-labelledby` all correct
- ✅ Progress dots actually have color-coded states (green=done, orange=current, grey=pending) once underway
- ✅ Quiz feedback shows after Check Answer (correct/incorrect + explanation)
- ✅ Personalised completion message: "Mastery Achieved — like Muga silk, your effort shines" (great Assamese branding)
- ✅ Gamification — 10 badges, 150 points, 2 earned/8 locked, named after local culture (Bihu Dancer, Brahmaputra Scholar, Gamosa Graduate, Muga Silk Master)
- ✅ Teacher class invite — QR code, 6-char class code, 4-digit PIN, deep link, WhatsApp share
- ✅ Admin school management — 394 real Assam schools loaded with codes (14H0001 etc.)
- ✅ Trilingual support functional throughout (English, Hindi, Assamese)
- ✅ AI Tutor uses Socratic method with appropriate emoji and analogies for the audience
- ✅ Service Worker active (PWA installable)

---

## Recommended priority order for fixes

1. **This week:** F-LESS-01 + F-LESS-02 (lesson images) — stop teaching wrong labels
2. **This week:** F-DATA-01 + F-DATA-02 (assessment scoring math) — assessments must produce trustworthy scores
3. **This week:** F-DATA-03 (IRT confidence) — don't tell a 1-answer student they're "Advanced"
4. **This week:** F-PROD-AS01 ("I don't understand this question") — kill the deceptive button
5. **Next week:** F-PROD-TCH01 + F-PROD-TCH03 (teacher sees student data) — teachers can't do their job without this
6. **Next week:** F-PROD-AI01 (first char strip) — minor but annoying
7. **Next week:** F-PROD-003 (Redis on Vercel)
8. **Then:** P2/P3 polish

---

## Artefacts

```
e2e-prod-test/
├── screenshots/
│   ├── phase0-anon/           (2 screenshots — landing, student-start)
│   ├── phase1-student/        (18 screenshots — dashboard, lesson, quiz, tutor, assessment, progress, settings)
│   ├── phase2-teacher/        (6 screenshots — classes, dashboard, analytics, assessments, class detail)
│   ├── phase3-admin/          (4 screenshots — pins, dashboard, performance, schools)
│   └── phase4-crosscut/       (1 screenshot — admin on teacher route)
└── E2E-PROD-REPORT.md         (this file)
```

DB queries used for validation are inline in the findings above. Re-runnable against Supabase project `hnlsqznoviwnyrkskfay`.

---

## Coverage notes — what I didn't test

- **Phone OTP sign-in** — needs real phone, would have used real SMS quota
- **Voice TTS playback** — couldn't verify audio output via headless browser
- **Offline PWA simulation** — couldn't toggle network in MCP session
- **Real password reset email** — needs real inbox
- **Mobile responsive deep sweep** — only verified during lesson screenshots from user; didn't sweep every page at 375px
- **Concurrent multi-tab session sync**
- **Notification permission flow**
- **PIN rotation write on prod** — deliberately skipped (would mutate real school data)
- **Account creation** — user instructed to skip (manual effort)
