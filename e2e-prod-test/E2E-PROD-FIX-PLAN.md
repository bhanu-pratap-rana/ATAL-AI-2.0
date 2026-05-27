# ATAL AI Production Fix Plan

Companion to [E2E-PROD-REPORT.md](./E2E-PROD-REPORT.md). 29 findings grouped into **5 sequential ship-able batches** with concrete file paths, DB migrations, and verification steps.

## Ship order

| Batch | What | Why this order | Effort (eng-days) |
|---|---|---|---|
| **B1 — Assessment integrity** | Fix scoring math + skip persistence + IRT confidence | Highest-trust loss if shipped wrong; blocks ed-product credibility | 2–3 |
| **B2 — Lesson content quality** | Replace gibberish images + separate prompt/caption/alt + size up + fix progress UI | Same credibility issue, content-side | 2–3 |
| **B3 — Teacher data visibility (RLS)** | Teachers see student AI/assessment data; build "I don't understand" feature | Teachers can't do their job without this | 1–2 |
| **B4 — Infra hardening** | Redis, robots.txt, sitemap.xml, OG/Twitter meta, AI-tutor first-char strip | SEO + crawler + reliability | 0.5–1 |
| **B5 — Polish** | Typography, naming, aria, settings UX, header copy | P2/P3 nice-to-have | 1–2 |

Total: **6.5–11 engineering days**. Each batch = one PR, one deploy, one verification cycle.

---

## B1 — Assessment integrity (3 P0s + 2 supporting)

**Goal:** A student who answers 1 of 30 questions correctly sees `3% (1/30)`, not `100% (1/1)`.

### B1.1 — Schema: persist total + skipped state
**Migration:** `apps/db/migrations/200_assessment_integrity.sql`
```sql
-- 1. Track question count per session so denominator is honest
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS total_questions integer;

-- 2. Track skip intent (NULL chosen_option already exists, but explicit boolean is clearer)
ALTER TABLE assessment_responses
  ADD COLUMN IF NOT EXISTS is_skipped boolean NOT NULL DEFAULT false;

-- 3. Backfill total_questions for existing sessions
UPDATE assessment_sessions s
SET total_questions = COALESCE(s.total_questions,
  (SELECT COUNT(*) FROM assessment_responses r WHERE r.session_id = s.id));

-- 4. Index for teacher queries
CREATE INDEX IF NOT EXISTS idx_assessment_responses_session_skipped
  ON assessment_responses(session_id, is_skipped) WHERE deleted_at IS NULL;
```

### B1.2 — Backend: insert row on Skip
**File:** `apps/web/src/app/actions/assessment/assessment-submission.ts`
- On `skipQuestion(sessionId, itemId)`, INSERT into `assessment_responses` with `is_correct=false, chosen_option=NULL, is_skipped=true`. Idempotent (use ON CONFLICT (session_id, item_id) DO NOTHING).
- On `startSession()`, write `total_questions` from the item bank size.

### B1.3 — Backend: score from the right denominator
**File:** `apps/web/src/app/actions/assessment/assessment-submission.ts` (and any RPC)
```ts
const correct = responses.filter(r => r.is_correct).length;
const totalQuestions = session.total_questions; // not responses.length
const scorePct = Math.round((correct / totalQuestions) * 100);
```
If migrating a stored procedure: edit `apps/db/migrations/052_add_submit_assessment_rpc.sql` lineage. Create migration `201_fix_submit_assessment_denominator.sql` replacing the function.

### B1.4 — Frontend: display fix
**File:** `apps/web/src/components/assessment/AssessmentSummary.tsx`
- Show `correct / total_questions` (e.g. `1/30`), not `1/1`.
- Add `Skipped: 29` count.

### B1.5 — IRT confidence gate
**File:** `apps/web/src/components/assessment/AssessmentSummary.tsx` (the `Ability Estimate (IRT)` block)
```tsx
const SE_THRESHOLD = 1.0;
{irt.standardError <= SE_THRESHOLD ? (
  <IrtPanel theta={irt.theta} se={irt.standardError} />
) : (
  <p>Answer more questions to estimate your skill level.</p>
)}
```
Also drop the "Advanced/Intermediate/Beginner" badge if `standardError > 1.0`.

### B1.6 — Frontend: gate Next on quiz chunks
**File:** `apps/web/src/components/microlearning/LessonPlayer.tsx`
- On QUIZ chunks, `<button disabled={!hasAnswered || !checked}>Next</button>`.
- OR collapse Next + Check into single "Submit & Continue".

### B1.7 — Verification
1. Take an assessment, skip 29, answer 1 correctly → summary shows `3% (1/30)`, NOT `100%`.
2. `SELECT COUNT(*) FROM assessment_responses WHERE session_id = ...` returns 30 rows (29 with `is_skipped=true`).
3. IRT panel hidden until 5+ items answered.
4. On a quiz chunk, Next is disabled until Check Answer is clicked.

### Findings closed: F-DATA-01, F-DATA-02, F-DATA-03, F-PROD-AS06, F-LESS-08

---

## B2 — Lesson content quality (4 P0/P1 + 3 P2)

**Goal:** Students learning from lessons don't memorise gibberish labels. Captions describe the lesson, not the AI image prompt.

### B2.1 — Schema: separate image fields
**Migration:** `apps/db/migrations/202_lesson_image_fields.sql`
```sql
-- Find the lesson chunk / lesson content table (likely `lesson_chunks` or `lesson_content`)
-- Inspect first: \d lesson_chunks
ALTER TABLE lesson_chunks
  ADD COLUMN IF NOT EXISTS image_caption text,    -- student-facing, ≤120 chars
  ADD COLUMN IF NOT EXISTS image_alt text;        -- ≤80 chars, screen reader
-- Existing `image_prompt` stays but is NEVER displayed
```

### B2.2 — Content audit + backfill
**One-off script:** `apps/db/scripts/backfill_lesson_image_captions.ts`
- For each chunk with an `image_prompt`:
  - `image_alt = first sentence of image_prompt, truncated to 80 chars + ellipsis if longer`
  - `image_caption = NULL` (force a human to write one OR generate via a smaller LLM call with explicit "student-facing caption, ≤15 words, no scene description" instruction)
- Optional second pass: run a single Gemini call per chunk with prompt: *"Given this lesson topic ‹topic_name› and this image prompt ‹prompt›, write a one-sentence student caption (≤15 words) that does NOT describe the picture but states the lesson concept."*

### B2.3 — Image gen pipeline change
**Files:** wherever images are generated for lessons (likely `apps/web/src/lib/ai/services/image-service.ts` or a worker)
- Stop generating labeled diagrams via image models — they hallucinate text.
- Two options (pick one):
  - **(a) Curate a library.** Build a `public/lesson-images/` set of ~50 correct illustrations covering the syllabus. Map `topic_id → image_path`. Stops generation entirely.
  - **(b) Overlay labels in SVG.** Generate the image *without text*, then render `<svg>` arrows + `<text>` over it in the browser. Code labels are pixel-perfect.

Recommend **(a)** for fastest credibility recovery; **(b)** as a follow-up if curation can't scale.

### B2.4 — Frontend: render captions, not prompts
**File:** `apps/web/src/components/microlearning/LessonPlayer.tsx` (lesson chunk renderer)
```tsx
<figure>
  <img src={chunk.imageUrl} alt={chunk.imageAlt || 'Diagram'} />
  {chunk.imageCaption && <figcaption>{chunk.imageCaption}</figcaption>}
</figure>
// REMOVE any reference to chunk.imagePrompt in JSX
```

### B2.5 — CSS: bigger image, bigger text
**File:** `apps/web/src/components/microlearning/LessonPlayer.tsx` + Tailwind classes
- Image: `w-full max-w-[720px] aspect-[4/3] object-contain`, click-to-zoom on mobile.
- Body text: `text-base md:text-lg` (16px mobile, 18px desktop).
- Add A−/A+ font-size control persisted to localStorage.

### B2.6 — Progress dots: add chunk-type icon
**File:** `apps/web/src/components/microlearning/LessonPlayer.tsx`
- Each dot gets a small icon: 📖 concept, ❓ quiz, ⭐ review.
- Color stays as secondary signal (green/orange/grey).
- Tooltip: `Chunk ${n+1} of ${total} — ${chunk.type}`.

### B2.7 — Remove duplicate language switcher
**File:** `apps/web/src/components/microlearning/LessonPlayer.tsx`
- Delete the in-page 3-pill row. Header combobox is sufficient.

### B2.8 — Fix double-space in MCQ option label
**File:** `apps/web/src/components/microlearning/LessonPlayer.tsx` (and `AssessmentOption.tsx`)
- The F42 strip regex `^[A-D][.)-]\s*` is correct. The double-space comes from the code adding its own `"A. "` then a leading space in `cleanOption`. Trim:
```tsx
const cleanOption = option.replace(/^[A-D][.)-]\s*/i, '').trimStart();
```

### B2.9 — Verification
1. M1/T1.2 image labels read "Monitor / Keyboard / Mouse / CPU Tower" — not "CP / Sealer / Muster".
2. Caption under image is human-readable lesson text, max ~15 words.
3. `<img alt>` is ≤80 chars and doesn't contain "diagram showing..."
4. Lesson body text is visibly bigger on mobile (use Chrome DevTools mobile inspect at 375px).
5. Progress dots show 📖❓⭐ icons.
6. MCQ option text: `"A. The Monitor"` (single space).

### Findings closed: F-LESS-01, F-LESS-02, F-LESS-03, F-LESS-04, F-LESS-05, F-LESS-06, F-LESS-07

---

## B3 — Teacher visibility + the "Help" button (3 P0/P1)

**Goal:** Teachers see their students' AI interactions and assessments. "I don't understand" actually helps.

### B3.1 — RLS migration: teacher reads
**Migration:** `apps/db/migrations/203_teacher_can_read_student_activity.sql`
```sql
-- AI tutor interactions: teacher reads enrolled students' rows
DROP POLICY IF EXISTS ai_tutor_interactions_teacher_select ON ai_tutor_interactions;
CREATE POLICY ai_tutor_interactions_teacher_select ON ai_tutor_interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE e.student_id = ai_tutor_interactions.student_id
        AND c.teacher_id = auth.uid()
        AND e.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
  );

-- Assessment sessions: same scope
DROP POLICY IF EXISTS assessment_sessions_teacher_select ON assessment_sessions;
CREATE POLICY assessment_sessions_teacher_select ON assessment_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE e.student_id = assessment_sessions.user_id
        AND c.teacher_id = auth.uid()
        AND e.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
  );

-- Same for assessment_responses (teachers can see what their students answered)
CREATE POLICY assessment_responses_teacher_select ON assessment_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_sessions s
      JOIN enrollments e ON e.student_id = s.user_id
      JOIN classes c ON c.id = e.class_id
      WHERE s.id = assessment_responses.session_id
        AND c.teacher_id = auth.uid()
    )
  );
```
**Test BEFORE applying to prod** — verify with `EXPLAIN` and a test query as `auth.uid() = '<teacher_id>'`.

### B3.2 — Verify teacher dashboard queries
**Files:** `apps/web/src/app/app/teacher/dashboard/page.tsx`, `apps/web/src/app/app/teacher/classes/[id]/page.tsx`, `apps/web/src/app/app/teacher/assessments/page.tsx`
- Check the queries actually JOIN `enrollments` and use `auth.uid()` indirectly via RLS. No app-layer filter needed beyond `class_id IN (SELECT id FROM classes WHERE teacher_id = $1)`.
- After RLS is fixed, simply re-run the existing queries — the empty states should populate.

### B3.3 — "I don't understand this question" — build the feature
**File:** `apps/web/src/components/assessment/AssessmentRunner.tsx`

Current behavior: button silently calls skip. Replace with:
```tsx
const [helpOpen, setHelpOpen] = useState(false);
// ... in JSX:
<button onClick={() => setHelpOpen(true)}>🤔 I don't understand this question</button>
{helpOpen && (
  <ExplainDrawer
    questionText={currentQuestion.text}
    questionLang={preferredLang}
    onClose={() => setHelpOpen(false)}
    onSkip={() => { skipQuestion(); setHelpOpen(false); }}
  />
)}
```

**New component:** `apps/web/src/components/assessment/ExplainDrawer.tsx`
- Side drawer (right on desktop, bottom sheet on mobile).
- Calls `/api/assessment/explain` with `{ question, language }`.
- API streams a simple-language rephrase (no answer revealed) using the existing AI tutor chain.
- Two CTAs at bottom: `"OK, I'll try"` (closes drawer, returns to question) and `"Skip this question"` (calls existing skip).

**New endpoint:** `apps/web/src/app/api/assessment/explain/route.ts`
- Reuses `getChatModel()` from `apps/web/src/lib/ai/services/chat-service.ts`.
- System prompt: *"You are helping a rural Indian student understand an assessment question. Rephrase the question in simpler ‹language›. Do NOT reveal the answer. Do NOT solve it. Just explain what the question is asking."*

### B3.4 — Verification
1. As teacher, open dashboard — "Recent AI Tutor Interactions" shows the demo student's 2 entries.
2. Teacher assessments page shows `Total Assessments: 2`, `Average Score: 27%`.
3. As student, click "I don't understand" → drawer opens, shows simpler rephrase, doesn't auto-skip.

### Findings closed: F-PROD-TCH01, F-PROD-TCH03, F-PROD-AS01, F-PROD-AS02

---

## B4 — Infra + crawler + AI tutor fixes (5 issues)

### B4.1 — Provision Redis
1. Create Upstash Redis free-tier database.
2. In Vercel → Settings → Environment Variables (Production + Preview):
   - `REDIS_URL` = `rediss://default:<token>@<host>:6379`
   - `REDIS_PASSWORD` = leave blank (URL contains it)
3. Verify: `curl https://www.atalai.co.in/api/health` → `"redis":{"status":"ok"}`.

### B4.2 — robots.txt + sitemap.xml
**New files:**
- `apps/web/src/app/robots.ts`
```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/app/', '/admin/', '/api/'] }
    ],
    sitemap: 'https://www.atalai.co.in/sitemap.xml',
  };
}
```
- `apps/web/src/app/sitemap.ts`
```ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.atalai.co.in';
  return [
    { url: `${base}/`, lastModified: new Date(), priority: 1 },
    { url: `${base}/student/start`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/teacher/start`, lastModified: new Date(), priority: 0.7 },
    { url: `${base}/admin/login`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/join`, lastModified: new Date(), priority: 0.6 },
  ];
}
```

### B4.3 — OG + Twitter meta tags
**File:** `apps/web/src/app/layout.tsx` (root metadata)
```ts
export const metadata: Metadata = {
  // ...existing
  openGraph: {
    title: 'ATAL AI — Digital Empowerment Platform',
    description: 'Empowering education through AI & technology — Jyoti brings light to learning',
    url: 'https://www.atalai.co.in',
    siteName: 'ATAL AI',
    images: [{ url: 'https://www.atalai.co.in/og-cover.png', width: 1200, height: 630 }],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ATAL AI — Digital Empowerment Platform',
    description: 'Empowering education through AI & technology',
    images: ['https://www.atalai.co.in/og-cover.png'],
  },
};
```
**Asset:** create `apps/web/public/og-cover.png` (1200×630, brand colors, "ATAL AI" + tagline).

### B4.4 — Fix AI tutor first-char strip
**File:** `apps/web/src/app/api/tutor/chat/route.ts` (or its client-side stream consumer)
**Root cause hypothesis:** somewhere `chunk.slice(1)` is being called, or a `data:` SSE prefix isn't being properly stripped (e.g. `text.replace(/^data:\s?/, '')` is consuming the wrong char). Reproduce by asking 5 questions and checking each response's first char.
**Fix steps:**
1. Add a `console.log('first chunk:', chunks[0])` server-side to see what the model returns vs what client receives.
2. If model output is fine, look at the AI SDK 6 SSE parser — there's a known issue with `useChat` v6 and certain providers stripping the leading char of the first text delta. Pin AI SDK to a working version or patch the chunk handler.

### B4.5 — Move /admin/pins under /app
**Files:**
- Move `apps/web/src/app/admin/pins/page.tsx` → `apps/web/src/app/app/admin/pins/page.tsx`.
- Update the admin nav in `apps/web/src/app/app/admin/layout.tsx` to include PIN Management link.
- Apply bento chrome styling (use `<AdminShell>` wrapper).
- Add 301 redirect from old path: `apps/web/next.config.ts` → `redirects: [{ source: '/admin/pins', destination: '/app/admin/pins', permanent: true }]`.

### B4.6 — Verification
1. `/api/health` → `redis: ok`.
2. `curl -I https://www.atalai.co.in/robots.txt` → `200 text/plain`.
3. `curl -I https://www.atalai.co.in/sitemap.xml` → `200 application/xml`.
4. Paste URL into [opengraph.xyz](https://www.opengraph.xyz/) → card preview renders.
5. AI tutor responses start with full first word.
6. `/admin/pins` → 301 → `/app/admin/pins`, page in bento chrome.

### Findings closed: F-PROD-001, F-PROD-002, F-PROD-003, F-PROD-004, F-PROD-005, F-PROD-AI01, F-PROD-AD01, F-PROD-AD02

---

## B5 — Polish (10 P2/P3 issues)

### B5.1 — Humanize module names
**File:** `apps/web/src/components/assessment/CategoryBreakdown.tsx` + `apps/web/src/app/app/progress/page.tsx`
The `humanizeCategoryName` function already exists in `CategoryBreakdown.tsx` (added in F40 fix). Apply the same helper everywhere `internet_web_awareness`-style strings render.

### B5.2 — Hide UUID in settings
**File:** `apps/web/src/app/app/settings/page.tsx`
- Replace the always-shown User ID with a collapsible "Show for support" disclosure.

### B5.3 — Assessment Reminders toggle
**File:** `apps/web/src/app/app/settings/page.tsx`
- Build the toggle (it already shows "Not Set" with no control).
- Backend: add `notification_preferences jsonb` column on `users` table if not present.
- Phase 1: just persist preference. Email sending is a separate feature.

### B5.4 — Fix Complete Assessment aria-label mismatch
**File:** `apps/web/src/components/assessment/AssessmentRunner.tsx`
- Find the Complete Assessment button. Change `aria-label="Go to next question"` → `aria-label="Complete assessment"`.

### B5.5 — Recommendations shouldn't link to locked modules
**File:** `apps/web/src/app/app/learn/page.tsx` (or wherever AI Recommendations renders)
- Filter the recommended topic by `module.is_unlocked`. If none unlocked → show "Keep going to unlock more recommendations".

### B5.6 — Bilingual subtitle when lang=English
**File:** `apps/web/src/app/app/learn/page.tsx` (the module cards)
- Conditionally show the native-script subtitle only when `language !== 'en'`. Or always show both — but consistently across all modules.

### B5.7 — Header copy
**File:** `apps/web/src/components/shells/StudentShell.tsx` or equivalent
- "STUDENT PORTAL / ATAL AI SYSTEM" → "ATAL AI" (lowercase / mixed case).

### B5.8 — Verification
Mostly visual — eyeball Settings, Progress, Learn pages and the lesson player.

### Findings closed: F-PROD-PROG01, F-PROD-PROG02, F-PROD-SET01, F-PROD-SET03, F-PROD-AS03, F-PROD-AS04, F-PROD-006, F-PROD-007, F-PROD-008, F-LESS-09, F-LESS-10

---

## Cross-cutting

### Testing each batch
After each batch ships:
1. Re-run the relevant Playwright scenes from the original E2E pass (see `e2e-prod-test/screenshots/` for visual references).
2. Re-query Supabase to confirm DB shape changes landed (queries are in the E2E report).
3. Smoke-test the 3 demo accounts (`demo.student@atal.com` / `demo.teacher@atal.com` / `demo.admin@atal.com`).

### Rollback plan
- DB migrations: each ALTER TABLE is additive (new columns, default values). Safe to leave on rollback.
- RLS policies: keep a `203_teacher_can_read_student_activity_rollback.sql` companion file with `DROP POLICY` statements.
- Frontend: standard Vercel rollback to previous deployment.

### Branch / PR structure
```
fix/b1-assessment-integrity       → main
fix/b2-lesson-content-quality     → main
fix/b3-teacher-rls-and-help       → main
fix/b4-infra-and-tutor            → main
fix/b5-polish                     → main
```
Each PR includes: migration + frontend + tests + screenshot of before/after.

### Don't forget
- Update demo migration `199_create_demo_accounts.sql` if column shape changes (it inserts into `assessment_sessions`, `assessment_responses` etc.).
- Update `apps/web/.env.example` for `REDIS_URL` notes.
- Bump CHANGELOG.

---

## Summary table

| Batch | Findings closed | Days | Risk |
|---|---|---|---|
| B1 | 5 (F-DATA-01/02/03, F-PROD-AS06, F-LESS-08) | 2–3 | Medium — touches scoring logic |
| B2 | 7 (F-LESS-01–07) | 2–3 | Low–Medium — content + UI |
| B3 | 4 (F-PROD-TCH01/03, F-PROD-AS01/02) | 1–2 | Medium — RLS changes |
| B4 | 8 (F-PROD-001–005, AI01, AD01/02) | 0.5–1 | Low |
| B5 | 10 (F-PROD-PROG01/02, SET01/03, AS03/04, 006–008, LESS-09/10) | 1–2 | Low |
| **Total** | **29 (all)** | **6.5–11** | — |
