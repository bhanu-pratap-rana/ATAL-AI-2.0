# Manual Test Plan — Write Paths Not Auto-Tested

**Why this exists:** Playwright MCP couldn't fire these because they mutate production data (create real users, generate real PINs, toggle real feature flags, etc.). Each is fast to run manually.

**Branch:** `fix/admin-portal-bugs-2026-05-12`
**Account:** `atal.app.ai@gmail.com` (super_admin)
**Estimated total time:** ~25 minutes

## Results so far (live verification on 2026-05-12)

| Test | Result | Note |
|------|--------|------|
| M1 — Create new admin | ✅ PASS | `tabst9917592685@gmail.com` created successfully |
| M2 — Duplicate email | ✅ PASS | "A user with this email address has already been registered" error shown |
| M5 — PIN Generate | ✅ PASS | Generation flow worked |
| Bonus: B6 — Admin list empty | ✅ FIXED | Was a separate bug discovered during M1 — Supabase Auth admin API returns "Database error finding users". Worked around via `list_admin_users` RPC. List now correctly shows both admin accounts. |

---

## Priority 1 — Verifies the fixes shipped on this branch

### M1. B5 — Create new admin from `/admin/manage`

Verifies the `verifySuperAdminAuth` short-circuit that replaced the failing `listUsers()` probe.

**Preconditions:** logged in as super_admin.

**Steps:**
1. Navigate to `/admin/manage`.
2. Click **Step 2: Create**.
3. Admin Email: `e2e-create-test+${Date.now()}@example.com` (use a real-looking but unused address).
4. Password: `TestPass1234!` (≥ 8 chars).
5. Confirm Password: same.
6. Click **Create Admin Account**.

**Expected:**
- Green banner "✓ Account Created Successfully!" within ~1s.
- No "Failed to access user database" error.
- Network tab: server action returns `{ success: true, userId: "..." }`.

**Cleanup:**
1. Switch to **Step 1: Delete** on the same page.
2. Enter the same test email → **Delete User** → confirm.

---

### M2. B5 — Try to create an admin with an email that already exists

Verifies the friendly duplicate-email error path.

**Steps:**
1. `/admin/manage` → Step 2: Create.
2. Email: `atal.app.ai@gmail.com` (your own logged-in email).
3. Password: anything ≥ 8 chars.
4. Submit.

**Expected:**
- Red error: `User with email atal.app.ai@gmail.com already exists. Use the admin panel to manage roles.`
- No 500 / no `Failed to access user database`.

---

### M3. B1 — Edit an IRT question

Verifies the `updateIRTQuestion` server action and the page's optimistic-update path.

**Preconditions:** logged in as super_admin.

**Steps:**
1. `/admin/questions` → confirm 100 questions visible.
2. Click any question card to open the editor.
3. Change **Difficulty (b)** from its current value to e.g. `0.5`.
4. Click **Save** (or whatever the editor commits with).

**Expected:**
- No 403, no "Failed to update".
- Difficulty value persists after page Refresh.
- Network: POST to the `updateIRTQuestion` server action returns success.

**Cleanup:**
- Restore the original value via the same edit flow, or skip if `0.5` is acceptable.

---

### M4. B1 — Search + filter the IRT bank

Verifies that filters re-call `getIRTQuestions` server-side.

**Steps:**
1. `/admin/questions`.
2. Change Language dropdown: All → **AS** (Assamese) → wait for re-load.
3. Change Category dropdown: All → `digital_device_familiarity` → wait.
4. Reset both to "All".

**Expected:**
- Counts update each time (Total Questions changes).
- No errors in console.
- Filter combinations stack correctly (e.g. AS + digital_device_familiarity returns ≤ AS-only count).

---

## Priority 2 — Other admin write paths (not bug-related, but never live-fired)

### M5. PIN Generate / Rotate on `/admin/pins`

**Steps:**
1. `/admin/pins`.
2. Search for a school that shows **"No PIN"** (e.g. `A H K MEMORIAL HIGH SCHOOL 14H0991`).
3. Click the school → Step 2 shows "No PIN configured".
4. Click **Generate New PIN**.
5. Note the generated 6-digit PIN.

**Expected:**
- Step 2 immediately flips to "✓ PIN Configured" with current timestamp.
- Active PIN count on `/admin/dashboard` increments by 1 after refresh.
- PIN value is shown once (for sharing) and the panel makes clear it cannot be retrieved again.

**Cleanup:**
- Rotating a freshly-generated test PIN is harmless. Leave it active or have school admin rotate later. **Do NOT generate PINs for production schools you don't have permission to PIN.**

---

### M6. Set Admin Role on `/admin/setup`

**Steps:**
1. Create a brand-new throwaway user first (via Step 2: Create flow in M1, but skip cleanup).
2. `/admin/setup` → enter that throwaway email → **Check Status** → expect "Not Admin Yet".
3. Click **Set Admin Role**.
4. Re-click **Check Status**.

**Expected:**
- Status flips to "Admin Role Set" (or similar success state).
- That user can now log in via `/admin/login`.

**Cleanup:**
- `/admin/manage` Step 1: Delete the throwaway user.

---

### M7. Feature flag toggle on `/admin/features`

**Steps:**
1. `/admin/features`.
2. Toggle **Voice AI Tutor** from 10% → 50% (or move the rollout slider).
3. Refresh page.
4. Toggle back to 10%.

**Expected:**
- Toggle state persists across refresh.
- No console errors.
- **IMPORTANT:** flags affect real users in production — choose a flag whose change is reversible and that you actually want to ship at that %. If unsure, pick a disabled flag, flip on, immediately flip off.

---

### M8. Delete User on `/admin/manage`

Already tested as cleanup in M1. Run independently only if you want to verify the confirmation dialog enforcement:

**Steps:**
1. Create another throwaway user via Step 2: Create.
2. Step 1: Delete → enter that email → click **Delete User**.
3. Confirmation dialog appears.
4. Click **Cancel** → dialog closes, user is NOT deleted.
5. Repeat → click **Delete User** in the confirm dialog.

**Expected:**
- After cancel: throwaway user still listed in `/admin/admins`.
- After confirm: user gone within ~1s; counts on dashboard drop.

---

## Priority 3 — Other roles (require logging out + in as a different user)

### M9. Teacher flow (smoke)

I observed your teacher session briefly. Walk it manually:

**Steps:**
1. Sign out of admin. Log in as a teacher (`/teacher/start` → Login to Account).
2. Dashboard renders → "Create Your First Class".
3. Create a test class → enrol a student (PIN or invite link).
4. Open student progress grid.
5. Post an announcement.

**Expected:** all flows work, no 403/500. Sign out cleanly.

### M10. Student flow (smoke)

**Steps:**
1. Sign in as a student (`/student/start` → Sign In) using one of the 31 existing accounts you can credential.
2. Land on `/app/student/dashboard`.
3. Open a lesson under "Learn".
4. Play through 1 lesson page.
5. Take a quick assessment item.
6. Open AI Tutor → ask a question.

**Expected:** lessons load, progress updates, AI tutor streams a response.

### M11. Super-admin-only routes

You already exercised these (`/admin/admins`, `/admin/setup`, `/admin/create`, `/admin/manage`). The thing I couldn't test is **role isolation**: log in as a *regular admin* (not super_admin) and verify that:

**Steps:**
1. Create a regular admin via M1 (the create flow assigns `admin` not `super_admin` because at least one super_admin already exists).
2. Log in as that admin.
3. Try to visit `/admin/admins`, `/admin/manage`, `/admin/create`.

**Expected:**
- Either redirected to `/admin/dashboard` with limited UI, OR shown an "insufficient permissions" message.
- They should NOT be able to delete other admins or create new ones.

---

## Priority 4 — Cross-cutting / hard to automate

### M12. Mobile viewport

**Steps:** open Chrome DevTools → toggle device toolbar → iPhone 12 (or run on a real phone).
1. Walk dashboard, modals, PIN wizard, login screens.

**Expected:** no overflow, buttons reachable, modals fit the screen.

### M13. Offline mode

**Steps:**
1. Log in as student. Visit `/app/learn` (lesson list cached).
2. DevTools → Network → **Offline**.
3. Reload. Open a lesson.

**Expected:** lessons load from IndexedDB cache; submitting an assessment queues it; reconnect → mutations flush.

### M14. Concurrent session security

**Steps:**
1. Log in as super_admin on Browser A.
2. Log in as same account on Browser B.
3. Sign out from A.
4. Try any admin action on B.

**Expected:** B's session is either still valid (if Supabase config keeps both), or invalidated (if single-session enforced). Either is fine — just know which.

### M15. Rate limiting

**Steps:**
1. From `/admin/manage` Step 2: Create, submit 11+ failed attempts in 1 minute (e.g. bad password).

**Expected:** after ~5-10 attempts, you get a `429 Too Many Requests` / rate-limit error. Wait 1 minute, then succeed.

---

## Reporting back

For each item, mark **PASS / FAIL** and capture:
- Screenshot if it fails.
- Network tab response (status + JSON).
- Console errors if any.

Bring me the failures and I'll diagnose + fix.
