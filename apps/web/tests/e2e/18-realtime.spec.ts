/**
 * Realtime — two live sessions: while the teacher watches the class
 * progress grid, a student data change must push a refetch to the
 * teacher's browser without any reload (migration 202 behavior).
 *
 * Trigger: the student opens a lesson practice flow and submits progress.
 * Detection: count teacher-page network requests after the student acts.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE, TEACHER_STATE } from "./helpers/credentials";

test("teacher grid refetches when student progress changes", async ({ browser }) => {
  test.setTimeout(180000);

  // 1. Teacher parks on the class detail page (grid subscribes to realtime).
  const teacherCtx = await browser.newContext({ storageState: TEACHER_STATE });
  const teacher = await teacherCtx.newPage();
  await teacher.goto("/app/teacher/dashboard");
  await teacher.waitForLoadState("networkidle");
  const classHref = await teacher.locator('a[href^="/app/teacher/classes/"]').first().getAttribute("href");
  await teacher.goto(classHref!);
  await teacher.waitForLoadState("networkidle");
  await expect(teacher.getByText(/Demo Student/).first()).toBeVisible({ timeout: 20000 });

  // Give the realtime subscription a moment to register server-side.
  await teacher.waitForTimeout(4000);

  // Start counting Supabase data refetches on the teacher page.
  let refetches = 0;
  teacher.on("request", (req) => {
    if (/supabase\.co\/rest\/v1\//.test(req.url())) refetches++;
  });

  // 2. Student triggers a knowledge-state write via the progress sync API.
  const studentCtx = await browser.newContext({ storageState: STUDENT_STATE });
  const student = await studentCtx.newPage();
  await student.goto("/app/learn/M1/T1.1");
  await student.waitForLoadState("networkidle");

  // Fire a progress update through the app's own API (same call the
  // lesson player makes on completion) — a no-op-score update still
  // produces an UPDATE event on student_knowledge_state.
  const syncStatus = await student.evaluate(async () => {
    const res = await fetch("/api/progress/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            type: "progress_update",
            data: { moduleId: "M1", topicId: "T1.1", score: 1 },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    return res.status;
  });
  expect([200, 207]).toContain(syncStatus);

  // 3. The teacher page must refetch within a few seconds — no reload.
  await expect
    .poll(() => refetches, { timeout: 15000, intervals: [1000] })
    .toBeGreaterThan(0);

  await teacherCtx.close();
  await studentCtx.close();
});
