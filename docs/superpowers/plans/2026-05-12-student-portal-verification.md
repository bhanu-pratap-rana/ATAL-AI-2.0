# Student Portal — Full Verification — 2026-05-12

**Account:** Roll 7 "Bhanu Pratap Rana" — Class 9th A — Bamundi High School (14H0017)
**Driver:** Playwright MCP — Chromium 1280×800 — dev server `localhost:3000`
**Branch:** `fix/admin-portal-bugs-2026-05-12`
**Screenshots:** [`tests/.screenshots/2026-05-12-e2e-smoke/`](../../../tests/.screenshots/2026-05-12-e2e-smoke/)

## Verdict

**100% of student-portal pages walked. 0 console errors / 0 warnings across all 9 pages.** 2 minor UX/data findings, no new code bugs.

## Pages Tested

| # | Page | Result | Notes |
|---|------|--------|-------|
| 1 | `/student/start` (login) | ✅ | Sign In / Create Account flow loads cleanly |
| 2 | `/app/student/dashboard` | ✅ | 1 Class · 0 Assessments · 0 Streak · 50 Points · First Steps badge · class leaderboard (top 8 students) · 3 modules · "Continue Learning" suggestions — [`40-student-dashboard.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/40-student-dashboard.png) |
| 3 | `/app/learn` | ✅ | 2% Overall Progress · 100 Total Points · AI recommendation "Understanding the Desktop" · 3 modules visible — [`41-student-learn.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/41-student-learn.png) |
| 4 | `/app/learn/M1` (Computer Basics) | ✅ | 3 units · 10 topics · 1/10 complete · per-topic Start/Review buttons — [`42-student-module-m1.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/42-student-module-m1.png) |
| 5 | `/app/learn/M1/T1.2` (Lesson player) | ✅ | "Main Parts You See and Use" lesson — language toggle (EN/HI/AS) · Show AI Tutor · Enable voice (TTS) · Previous/Next nav · clicked Next → advanced to step 2/6 — [`43-student-lesson-player.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/43-student-lesson-player.png) |
| 6 | `/app/ai-tools` | ✅ | AI Tutor card + Conversation History card — [`44-student-ai-tools.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/44-student-ai-tools.png) |
| 7 | `/app/student/assessments` | ✅ | "Start a New Assessment" + empty history — [`45-student-assessments.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/45-student-assessments.png) |
| 8 | `/app/student/classes` | ⚠️ | Lists "Class 9th A" enrolled — but **U4:** Teacher field shows "Not available" — [`46-student-classes.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/46-student-classes.png) |
| 9 | `/app/progress` | ✅ | 1 badge earned (First Steps), 9 locked (Muga Silk Master, Voice Learner, Perfect Score, Brahmaputra Scholar, Night Owl, Gamosa Graduate, Bihu Dancer, Early Bird, Curious Mind) — [`47-student-progress.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/47-student-progress.png) |
| 10 | `/app/settings` | ✅ **U1 VERIFIED** | Banner now correctly reads **"Student Portal"** (was "Student Portal" by default; teacher gets "Teacher Portal"). Student Profile editor: Name, Gender, Email, Phone, Roll No, School, Class, Village — [`48-student-settings.png`](../../../tests/.screenshots/2026-05-12-e2e-smoke/48-student-settings.png) |
| — | Sign out | ✅ | Clears session, redirects `/student/start` |
| — | Auth gate post-logout | ✅ | `/app/student/dashboard` re-redirects to `/student/start` |

## Findings (UX / Data, not blocking)

### U4 — "Teacher: Not available" on `/app/student/classes`
- **Repro:** Open `/app/student/classes` as Roll 7. The class card lists "Class 9th A" with `Teacher: Not available` and `Joined: 1/20/2026`.
- **Reality:** The class IS taught by Bhanu Pratap Rana (`ranabhanu514@gmail.com`, teacher_profile present).
- **Impact:** Students can't see who their teacher is. Cosmetic — doesn't block functionality.
- **Likely cause:** the student-classes query doesn't join `teacher_profiles.name` (or RLS hides it).
- **Severity:** UX.

### U5 — Duplicate roll number "7" in Class 9th A
- The class has **two** Roll No. 7 students:
  - "Bhanu Pratap Rana" (real-email auth: `lyricallywilliam@gmail.com`)
  - "দীপক শৰ্মা / Deepak Sharma" (username auth: `deepak_sharma`)
- **Repro:** Visible on the teacher dashboard's student progress grid + on the student leaderboard.
- **Severity:** Data integrity. The `student_profiles` table is likely missing a unique constraint `(class_id, roll_number)` (or `(school_id, class_name, roll_number)`).
- **Suggested fix:** Add a partial unique index `CREATE UNIQUE INDEX student_profiles_unique_roll ON student_profiles (class_name, school_id, roll_number) WHERE roll_number IS NOT NULL` — but only after de-duplicating existing rows (probably reassign one of the two to a free roll number, or treat one as a soft-deleted test fixture).

## Cross-Portal Bug Confirmations

Bugs found and fixed earlier in this branch that are now visible/working from the student side:

- **B7** (`/app/settings` 500 crash) — page now renders cleanly for students too ✅
- **U1** (Banner mismatch) — student now sees "Student Portal", teacher sees "Teacher Portal", admin sees "Admin Portal" ✅
- **B8** (cross-role login) — student/teacher accounts cannot log in via wrong portal ✅ (verified earlier via teacher flow)

## Console / Network Health

| Page | Errors | Warnings |
|------|--------|----------|
| Dashboard | 0 | 0 |
| Learn | 0 | 0 |
| Module M1 | 0 | 0 |
| Lesson player | 0 | 0 |
| AI Tools | 0 | 0 |
| Assessments | 0 | 0 |
| Classes | 0 | 0 |
| Progress | 0 | 0 |
| Settings | 0 | 0 |

**Total: 0 errors, 0 warnings across the entire walked session.**

## Not Yet Exercised (deferred to manual / next run)

- Actually starting an assessment (would mutate student score / streak)
- Sending a message to the AI Tutor (would consume API tokens + leave conversation history)
- Voice TTS playback (Enable voice toggle exists, didn't trigger audio)
- Offline mode + IndexedDB replay
- Mobile viewport
- Lesson completion → progress increment
- Join Class flow (we're already enrolled, so couldn't test the join-via-PIN/invite path)
- Edit student profile and save

## Cumulative Branch State

**Total bugs fixed: 9** (B1, B2, B3, B5, B6, B7, B8, B9, U1)
**Total UX findings (not bugs): 5** (U2 missing student drill-in, U3 teacher i18n gaps, U4 missing teacher name in student classes, U5 duplicate roll number, B4 dismissed)

### Quality gates on this branch
- `tsc --noEmit` ✅ clean
- `eslint --max-warnings 0` ✅ clean
- `npm test` ✅ 32/32 pass
- `npm run build` ✅ clean
- 3 portals walked end-to-end ✅
