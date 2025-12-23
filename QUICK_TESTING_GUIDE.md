# ATAL AI - Complete E2E Testing Guide

> **Version:** 3.0
> **Last Updated:** December 23, 2025
> **Total Test Cases:** 150+
> **Estimated Duration:** 4-6 hours (full suite)

---

## Table of Contents

1. [Pre-Test Setup](#1-pre-test-setup)
2. [Teacher Flow Tests](#2-teacher-flow-tests)
3. [Student Flow Tests](#3-student-flow-tests)
4. [Assessment Flow Tests](#4-assessment-flow-tests)
5. [Admin Flow Tests](#5-admin-flow-tests)
6. [Cross-Role Integration Tests](#6-cross-role-integration-tests)
7. [Screenshot Checkpoints](#7-screenshot-checkpoints)
8. [Flow Diagrams](#8-flow-diagrams)

---

## 1. Pre-Test Setup

### Environment Verification

```bash
# 1. Start development server
cd apps/web && npm run dev

# 2. Verify build passes
npm run build

# 3. Check database connection
# Use Supabase dashboard or MCP tools
```

### Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Super Admin | atal.app.ai@gmail.com | [from DB] | Has all permissions |
| Teacher (Test) | teacher.test@example.com | Test@123 | Create new for testing |
| Student (Test) | student.test@example.com | Test@123 | Create new for testing |

### Database Verification Checklist

- [ ] 44 migrations applied
- [ ] 13 SECURITY DEFINER functions exist
- [ ] pgcrypto in extensions schema
- [ ] At least 1 school exists (for teacher verification)
- [ ] School has active PIN set

---

## 2. Teacher Flow Tests

### 2.1 Teacher Registration Flow

#### Test T-REG-001: New Teacher - Email Registration
**Precondition:** No existing teacher account with test email

| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/teacher/start` | Teacher start page loads | Same page | `T-REG-001-01.png` |
| 2 | Click "Create New Account" | Choice step shows | Same page, choice view | |
| 3 | Select "Email" tab | Email input field shows | Same page, email tab | |
| 4 | Enter valid email (new) | Email field populated | Same page | |
| 5 | Click "Send Code" | OTP sent, code field appears | Same page, OTP step | `T-REG-001-02.png` |
| 6 | Enter 6-digit OTP code | OTP verified | Same page | |
| 7 | Enter password (8+ chars) | Password field accepts | Same page | |
| 8 | Confirm password | Passwords match | Same page | |
| 9 | Click "Continue" | **TRANSITION** | School Verification step | `T-REG-001-03.png` |
| 10 | Enter valid school code | School code accepted | Same page | |
| 11 | Enter school PIN | PIN field accepts | Same page | |
| 12 | Click "Verify" | School verified | Same page, shows school name | `T-REG-001-04.png` |
| 13 | Fill profile: Name, Gender | Fields populated | Same page, Profile step | |
| 14 | Click "Complete Registration" | Profile saved | **REDIRECT** | `T-REG-001-05.png` |
| 15 | Auto-redirect (2-3 sec) | **FINAL DESTINATION** | `/app/teacher/classes` | `T-REG-001-06.png` |

**Flow Summary:**
```
/teacher/start [Choice] → [Email OTP] → [Password] → [School Verify] → [Profile] → /app/teacher/classes
```

---

#### Test T-REG-002: New Teacher - Phone Registration
| Step | Action | Expected Result | Next Screen |
|------|--------|-----------------|-------------|
| 1 | Navigate to `/teacher/start` | Page loads | Same |
| 2 | Click "Create New Account" | Choice shows | Same |
| 3 | Select "Phone" tab | Phone input with +91 | Same |
| 4 | Enter 10-digit phone | Phone validated | Same |
| 5 | Click "Send OTP" | SMS sent | Same, OTP step |
| 6 | Enter OTP from SMS | Verified | Same |
| 7 | Set password | Accepted | Same |
| 8 | Complete school verification | School linked | School step |
| 9 | Complete profile | Profile saved | Profile step |
| 10 | Auto-redirect | **FINAL** | `/app/teacher/classes` |

---

#### Test T-REG-003: Existing Email - Shows Login Prompt
| Step | Action | Expected Result | Next Screen |
|------|--------|-----------------|-------------|
| 1 | Navigate to `/teacher/start` | Page loads | Same |
| 2 | Try signup with existing email | "Account exists. Please login." | Same, shows message |
| 3 | Click login link | **TRANSITION** | Login tab selected |

---

### 2.2 Teacher Login Flow

#### Test T-LOG-001: Successful Email Login
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/teacher/start` | Page loads | Same | |
| 2 | Click "Login to Account" | Login form shows | Same, login tab | `T-LOG-001-01.png` |
| 3 | Enter email | Email populated | Same | |
| 4 | Enter password | Password masked | Same | |
| 5 | Click "Sign In" | Authentication succeeds | **REDIRECT** | |
| 6 | **FINAL DESTINATION** | Teacher Classes page | `/app/teacher/classes` | `T-LOG-001-02.png` |

**Flow Summary:**
```
/teacher/start [Login] → /app/teacher/classes
```

---

#### Test T-LOG-002: Forgot Password Flow
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Click "Forgot your password?" | Recovery form | Same, forgot step | `T-LOG-003-01.png` |
| 2 | Enter email | Email populated | Same | |
| 3 | Click "Send Reset Code" | OTP sent | Same, OTP step | |
| 4 | Enter OTP + new password | Fields populated | Same | `T-LOG-003-02.png` |
| 5 | Click "Reset Password" | Password updated | **TRANSITION** | |
| 6 | **FINAL** | Login form, email prefilled | Same, login tab | `T-LOG-003-03.png` |

---

### 2.3 Teacher Class Management

#### Test T-CLS-001: Create New Class
**Precondition:** Logged in as teacher, on `/app/teacher/classes`

| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | View `/app/teacher/classes` | Classes list page | Same | `T-CLS-001-01.png` |
| 2 | Click "Create Class" button | Dialog opens | Same + Dialog | `T-CLS-001-02.png` |
| 3 | Enter class name: "Class 10-A" | Name populated | Dialog | |
| 4 | Enter subject: "Mathematics" | Subject populated | Dialog | |
| 5 | Click "Create" | Class created | Dialog success view | |
| 6 | Dialog shows code + PIN | 6-char code, 4-digit PIN | Dialog | `T-CLS-001-03.png` |
| 7 | Click "Done" | Dialog closes | **STAYS** on classes page | `T-CLS-001-04.png` |
| 8 | New card visible | Card shows in grid | Same, refreshed | |

**Flow Summary:**
```
/app/teacher/classes → [Create Dialog] → /app/teacher/classes (stays, card added)
```

---

#### Test T-CLS-002: View Class Details (Roster)
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | On classes list | Cards visible | `/app/teacher/classes` | |
| 2 | Click "View Roster" on card | **NAVIGATES** | `/app/teacher/classes/{id}` | `T-CLS-003-01.png` |
| 3 | View class header | Name, student count | Same | |
| 4 | View invite section | Code + PIN displayed | Same | `T-CLS-003-02.png` |
| 5 | View roster table | Student rows | Same | `T-CLS-003-03.png` |
| 6 | Click Back arrow | **NAVIGATES** | `/app/teacher/classes` | |

**Flow Summary:**
```
/app/teacher/classes → /app/teacher/classes/{id} → /app/teacher/classes (back)
```

---

#### Test T-CLS-003: Edit Class Details
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Click "Manage Class" on card | Dialog opens | Same + Dialog | `T-CLS-004-01.png` |
| 2 | Change class name | New name | Dialog | |
| 3 | Change subject | New subject | Dialog | |
| 4 | Click "Update Class" | Toast: "Updated!" | Dialog closes | `T-CLS-004-02.png` |
| 5 | **STAYS** on page | Card shows updated | `/app/teacher/classes` | `T-CLS-004-03.png` |

---

#### Test T-CLS-004: Delete Class
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Click "Manage Class" | Dialog opens | Same + Dialog | |
| 2 | Click "Delete Class" (red) | Confirmation dialog | Nested dialog | `T-CLS-005-01.png` |
| 3 | Click "Confirm Delete" | Class deleted | Dialog closes | |
| 4 | **STAYS** on page | Card removed | `/app/teacher/classes` | `T-CLS-005-02.png` |

---

### 2.4 Student Management in Class

#### Test T-STU-001: Remove Student from Class
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | On class detail page | Roster visible | `/app/teacher/classes/{id}` | |
| 2 | Click "Remove" on student | Confirmation | Same + Dialog | `T-STU-003-01.png` |
| 3 | Confirm removal | Student removed | Dialog closes | |
| 4 | **STAYS** on page | Roster refreshed | Same page | `T-STU-003-02.png` |

---

### 2.5 Teacher Navigation

#### Test T-NAV-001: Sign Out
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Click "Sign Out" | Session cleared | **REDIRECT** | |
| 2 | **FINAL** | Login page | `/teacher/start` | `T-NAV-002-01.png` |

---

## 3. Student Flow Tests

### 3.1 Student Registration Flow

#### Test S-REG-001: Email Registration (Full Flow)
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/student/start` | Page loads | Same | `S-REG-001-01.png` |
| 2 | Click "Create Account" | Signup options | Same, signup view | |
| 3 | Select "Email" tab | Email field | Same | `S-REG-001-02.png` |
| 4 | Enter email | Populated | Same | |
| 5 | Click "Send Code" | OTP sent | Same, OTP step | |
| 6 | Enter 6-digit OTP | Verified | Same | `S-REG-001-03.png` |
| 7 | Enter password | Accepted | Same | |
| 8 | Confirm password | Matches | Same | |
| 9 | Click "Create Account" | Account created | **TRANSITION** | |
| 10 | **Profile Step Shows** | Profile form | Same, profile step | `S-REG-001-04.png` |
| 11 | Fill: Name, Gender | Required fields | Same | |
| 12 | Fill: School, Class (optional) | Optional fields | Same | |
| 13 | Click "Save Profile" | Profile saved | **TRANSITION** | |
| 14 | **Join Class Step** | Join form | Same, join step | `S-REG-001-05.png` |
| 15 | Enter class code + PIN | Fields populated | Same | |
| 16 | Click "Join Class" | Enrolled | **REDIRECT** | |
| 17 | **FINAL DESTINATION** | Dashboard | `/app/dashboard` | `S-REG-001-06.png` |

**Flow Summary:**
```
/student/start [Email OTP] → [Password] → [Profile] → [Join Class] → /app/dashboard
```

---

#### Test S-REG-002: Quick Start (Username) Registration
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/student/start` | Page loads | Same | |
| 2 | Click "Create Account" | Options show | Same | |
| 3 | Select "Quick Start" tab | Username form | Same | `S-REG-003-01.png` |
| 4 | Enter username (3-20 chars) | Validated | Same | |
| 5 | See availability | "Available" or error | Same | |
| 6 | Enter password | Accepted | Same | |
| 7 | Confirm password | Matches | Same | |
| 8 | Click "Create Account" | Created + Auto-login | **TRANSITION** | |
| 9 | **Profile Step** | Profile form | Same | `S-REG-003-02.png` |
| 10-17 | Complete profile + join | Same as email | | |

---

#### Test S-REG-003: Skip Join Class
| Step | Action | Expected Result | Next Screen |
|------|--------|-----------------|-------------|
| 1 | Complete profile step | Join class shows | Same |
| 2 | Click "Skip for now" | Skips join | **REDIRECT** |
| 3 | **FINAL** | Dashboard (no class) | `/app/dashboard` |

---

### 3.2 Student Login Flow

#### Test S-LOG-001: Email Login
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/student/start` | Page loads | Same | |
| 2 | Click "Login" | Login form | Same, login tab | `S-LOG-001-01.png` |
| 3 | Select "Email" tab | Email + password | Same | |
| 4 | Enter credentials | Populated | Same | |
| 5 | Click "Sign In" | Authenticated | **REDIRECT** | |
| 6 | **FINAL DESTINATION** | Dashboard | `/app/dashboard` | `S-LOG-001-02.png` |

**Flow Summary:**
```
/student/start [Login] → /app/dashboard
```

---

#### Test S-LOG-002: Username Login
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Select "Username" tab | Username + password | Same | `S-LOG-003-01.png` |
| 2 | Enter username | Populated | Same | |
| 3 | Enter password | Masked | Same | |
| 4 | Click "Sign In" | Authenticated | **REDIRECT** | |
| 5 | **FINAL** | Dashboard | `/app/dashboard` | `S-LOG-003-02.png` |

---

### 3.3 Join Class Flow

#### Test S-JON-001: Join Class During Registration
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | After profile save | Join step shows | Same | `S-JON-001-01.png` |
| 2 | Enter 6-char code | Code validated | Same | |
| 3 | See class preview | "Class Found: {name}" | Same | `S-JON-001-02.png` |
| 4 | Enter 4-digit PIN | PIN field | Same | |
| 5 | Click "Join Class" | Enrolled | **REDIRECT** | |
| 6 | **FINAL** | Dashboard | `/app/dashboard` | `S-JON-001-03.png` |

---

#### Test S-JON-002: Join Class from /join Page
**Precondition:** Already logged in

| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/join` | Join page | Same | `S-JON-002-01.png` |
| 2 | Enter class code | Code field | Same | |
| 3 | See class preview | Class + teacher shown | Same | `S-JON-002-02.png` |
| 4 | Enter PIN | PIN field | Same | |
| 5 | Click "Join" | Enrolled | **REDIRECT** | |
| 6 | **FINAL** | Student classes | `/app/student/classes` | `S-JON-002-03.png` |

**Flow Summary:**
```
/join → /app/student/classes
```

---

### 3.4 Student Dashboard & Classes

#### Test S-DSH-001: Dashboard Display
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Login as student | Dashboard loads | `/app/dashboard` | `S-DSH-001-01.png` |
| 2 | View welcome | "Hello, {name}!" | Same | |
| 3 | View stats | 4 cards | Same | `S-DSH-001-02.png` |
| 4 | Click "Classes" card | **NAVIGATES** | `/app/student/classes` | |

---

#### Test S-CLS-001: View Enrolled Classes
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/app/student/classes` | Page loads | Same | `S-CLS-001-01.png` |
| 2 | View class cards | Enrolled classes | Same | |
| 3 | Click "Start Assessment" | **NAVIGATES** | `/app/assessment/start?classId={id}` | |

---

### 3.5 Student Profile

#### Test S-SET-001: Update Profile
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/app/settings` | Settings page | Same | `S-SET-001-01.png` |
| 2 | Click "Edit Profile" | Edit mode | Same | `S-SET-002-01.png` |
| 3 | Change fields | Updated | Same | |
| 4 | Click "Save" | Toast: "Saved!" | **STAYS** | `S-SET-002-02.png` |

---

## 4. Assessment Flow Tests

### 4.1 Start Assessment

#### Test A-STR-001: Start New Assessment
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/app/assessment/start` | Start page | Same | `A-STR-001-01.png` |
| 2 | Select language | Highlighted | Same | |
| 3 | Read info card | "What to expect" | Same | `A-STR-001-02.png` |
| 4 | Click "Start Assessment" | Session created | **TRANSITION** | |
| 5 | **Assessment Begins** | Question 1 shows | Same, runner view | `A-STR-001-03.png` |

---

### 4.2 During Assessment (30 Questions)

#### Test A-QST-001: Answer Question & Next
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | View question 1 | Q + 4 options | Same | `A-QST-001-01.png` |
| 2 | Click option A | Highlighted | Same | |
| 3 | Click "Next" | **Q2 shows** | Same, Q2 | `A-QST-001-02.png` |

---

#### Test A-QST-002: Skip Question
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | View question | Displayed | Same | |
| 2 | Click "Skip" | Skipped | **Next Q** | `A-QST-002-01.png` |
| 3 | Dot turns orange | Skipped status | Same | |

---

#### Test A-QST-003: Previous Question
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | On question 5 | Q5 displayed | Same | |
| 2 | Click "Previous" | **Q4 shows** | Same, Q4 | `A-QST-003-01.png` |
| 3 | Previous answer visible | Selection shown | Same | |

---

#### Test A-QST-004: Clear Answer
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Answer question | Selected | Same | |
| 2 | Click "Clear" | Cleared | Same | `A-QST-004-01.png` |
| 3 | Dot turns yellow | Viewed, not answered | Same | |

---

#### Test A-QST-005: Jump via Pagination
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | View pagination dots | 5 visible | Same | `A-QST-005-01.png` |
| 2 | Click dot for Q10 | **Q10 shows** | Same, Q10 | `A-QST-005-02.png` |

---

#### Test A-QST-006: Complete All 30 Questions
| Step | Action | Expected Result | Next Screen |
|------|--------|-----------------|-------------|
| 1-30 | Answer each question | Progress | Same |
| 31 | After Q30 | Submit button visible | Same |

---

### 4.3 Submit Assessment

#### Test A-SUB-001: Submit Complete Assessment
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | All questions answered | Submit visible | Same | `A-SUB-001-01.png` |
| 2 | Click "Submit Assessment" | Processing | Same | |
| 3 | Submission complete | **REDIRECT** | `/app/assessment/summary?session={id}` | `A-SUB-001-02.png` |

**Flow Summary:**
```
/app/assessment/start [Q1-Q30] → /app/assessment/summary?session={id}
```

---

### 4.4 Assessment Results

#### Test A-RES-001: View Results Summary
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | After submit | Summary loads | `/app/assessment/summary` | `A-RES-001-01.png` |
| 2 | View score circle | Percentage | Same | |
| 3 | View message | Encouragement | Same | |
| 4 | View correct/total | "24/30" | Same | `A-RES-001-02.png` |

---

#### Test A-RES-002: Module Breakdown
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Scroll to breakdown | Modules visible | Same | `A-RES-002-01.png` |
| 2 | View 5 modules | Scores per module | Same | |

---

#### Test A-RES-003: Results Actions
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Click "Retake Assessment" | **NAVIGATES** | `/app/assessment/start` | `A-RES-004-01.png` |
| 2 | OR Click "Back to Dashboard" | **NAVIGATES** | `/app/dashboard` | |

**Flow Summary:**
```
/app/assessment/summary → /app/assessment/start (retake)
                        → /app/dashboard (back)
```

---

### 4.5 Assessment History

#### Test A-HIS-001: View Assessment History
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/app/student/assessments` | Page loads | Same | `A-HIS-001-01.png` |
| 2 | View history list | Previous attempts | Same | |
| 3 | Click "View Details" | **NAVIGATES** | `/app/assessment/summary?session={id}` | `A-HIS-001-02.png` |

---

## 5. Admin Flow Tests

### 5.1 Admin Login

#### Test AD-LOG-001: Super Admin Login
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/admin/login` | Login page | Same | `AD-LOG-001-01.png` |
| 2 | Enter credentials | Populated | Same | |
| 3 | Click "Sign In" | Authenticated | **REDIRECT** | |
| 4 | **FINAL** | Admin dashboard | `/admin/dashboard` | `AD-LOG-001-02.png` |

**Flow Summary:**
```
/admin/login → /admin/dashboard
```

---

### 5.2 Admin Dashboard

#### Test AD-DSH-001: View Metrics
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | On dashboard | Metrics visible | `/admin/dashboard` | `AD-DSH-001-01.png` |
| 2 | View counts | Schools, Teachers, Students | Same | |

---

### 5.3 PIN Management

#### Test AD-PIN-001: View PIN Status
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/admin/pins` | PIN page | Same | `AD-PIN-001-01.png` |
| 2 | View schools list | Schools with status | Same | |

---

#### Test AD-PIN-002: Rotate PIN
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Click "Rotate PIN" | Dialog opens | Same + Dialog | `AD-PIN-002-01.png` |
| 2 | Enter new PIN | 4 digits | Dialog | |
| 3 | Click "Update" | PIN rotated | Dialog closes | `AD-PIN-002-02.png` |
| 4 | **STAYS** on page | List refreshed | Same | |

---

### 5.4 Admin Management

#### Test AD-ADM-001: Create Admin
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Navigate to `/admin/admins` | Admin list | Same | `AD-ADM-001-01.png` |
| 2 | Click "Create Admin" | Dialog opens | Same + Dialog | `AD-ADM-002-01.png` |
| 3 | Enter details | Fields populated | Dialog | |
| 4 | Click "Create" | Admin created | Dialog closes | `AD-ADM-002-02.png` |
| 5 | **STAYS** on page | Row added | Same | |

---

#### Test AD-ADM-002: Delete Admin
| Step | Action | Expected Result | Next Screen | Screenshot |
|------|--------|-----------------|-------------|------------|
| 1 | Click "Delete" on admin | Confirmation | Same + Dialog | `AD-ADM-003-01.png` |
| 2 | Confirm | Admin deleted | Dialog closes | |
| 3 | **STAYS** on page | Row removed | Same | `AD-ADM-003-02.png` |

---

## 6. Cross-Role Integration Tests

### 6.1 Teacher Creates Class → Student Joins

| Step | Actor | Action | Result | Next Screen |
|------|-------|--------|--------|-------------|
| 1 | Teacher | Create class "Test Class" | Code: ABC123, PIN: 1234 | Stays on classes |
| 2 | Student | Navigate to `/join` | Join page | `/join` |
| 3 | Student | Enter ABC123 | Class preview | Same |
| 4 | Student | Enter 1234 + Join | Enrolled | `/app/student/classes` |
| 5 | Teacher | View roster | Student visible | `/app/teacher/classes/{id}` |

---

### 6.2 Student Takes Assessment → Views Results

| Step | Actor | Action | Result | Next Screen |
|------|-------|--------|--------|-------------|
| 1 | Student | Start assessment | Q1 shows | `/app/assessment/start` |
| 2 | Student | Answer 30 questions | All answered | Same |
| 3 | Student | Submit | Results | `/app/assessment/summary` |
| 4 | Student | View history | Entry visible | `/app/student/assessments` |
| 5 | Teacher | View class assessments | Student score | `/app/teacher/assessments/{id}` |

---

## 7. Screenshot Checkpoints

### Directory Structure
```
tests/screenshots/
├── teacher/
│   ├── registration/    (6 screenshots)
│   ├── login/           (3 screenshots)
│   ├── classes/         (10 screenshots)
│   └── students/        (5 screenshots)
├── student/
│   ├── registration/    (8 screenshots)
│   ├── login/           (4 screenshots)
│   ├── classes/         (4 screenshots)
│   ├── assessment/      (15 screenshots)
│   └── results/         (5 screenshots)
├── admin/
│   ├── login/           (2 screenshots)
│   ├── dashboard/       (2 screenshots)
│   └── pins/            (5 screenshots)
└── integration/         (10 screenshots)
```

### Naming Convention
```
{TEST-ID}-{STEP}.png
Example: T-REG-001-05.png = Teacher Registration Test 1, Step 5
```

---

## 8. Flow Diagrams

### Teacher Complete Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     TEACHER FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

[/teacher/start] ─── Login ──────────────────────► [/app/teacher/classes]
       │                                                    │
       │                                                    │
       ▼                                                    ▼
    Register                                    ┌──────────────────┐
       │                                        │  CLASS ACTIONS   │
       ▼                                        ├──────────────────┤
   [Email/Phone OTP]                            │ • Create Class   │
       │                                        │ • Edit Class     │
       ▼                                        │ • Delete Class   │
   [Set Password]                               │ • View Roster    │
       │                                        └────────┬─────────┘
       ▼                                                 │
   [School Verify]                                       ▼
       │                                        [/app/teacher/classes/{id}]
       ▼                                                 │
   [Profile]                                             │
       │                                        ┌────────┴─────────┐
       ▼                                        │ ROSTER ACTIONS   │
   [/app/teacher/classes]                       │ • Invite Student │
                                                │ • Remove Student │
                                                │ • View Analytics │
                                                └──────────────────┘
```

### Student Complete Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

[/student/start] ─── Login ──────────────────────► [/app/dashboard]
       │                                                    │
       │                                                    │
       ▼                                                    ▼
    Register                                    ┌──────────────────┐
       │                                        │ DASHBOARD CARDS  │
       ▼                                        ├──────────────────┤
   [Email/Phone/Username]                       │ Classes ─────────┼──► [/app/student/classes]
       │                                        │ Assessments ─────┼──► [/app/student/assessments]
       ▼                                        │ Settings ────────┼──► [/app/settings]
   [Set Password]                               │ AI Tools ────────┼──► [/app/ai-tools]
       │                                        └──────────────────┘
       ▼
   [Profile] ──► [Join Class] ──► [/app/dashboard]
                      │
                      └─► OR Skip ──► [/app/dashboard]
```

### Assessment Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                   ASSESSMENT FLOW                                │
└─────────────────────────────────────────────────────────────────┘

[/app/assessment/start]
       │
       │ Click "Start"
       ▼
   ┌──────────────────────────────────────────────────────────┐
   │                    QUESTION LOOP (Q1-Q30)                 │
   │  ┌─────────────┐                                         │
   │  │ Question N  │                                         │
   │  └──────┬──────┘                                         │
   │         │                                                │
   │    ┌────┴────┬────────┬────────┐                        │
   │    │         │        │        │                        │
   │    ▼         ▼        ▼        ▼                        │
   │  Answer    Skip    Previous  Clear                      │
   │    │         │        │        │                        │
   │    └────┬────┴────────┴────────┘                        │
   │         │                                                │
   │         ▼                                                │
   │   [Next Question] ──────────────────────────────────────┘
   │
   │   After Q30:
   └────────────────┬─────────────────────────────────┘
                    │
                    ▼
              [Submit Assessment]
                    │
                    ▼
   [/app/assessment/summary?session={id}]
                    │
            ┌───────┴───────┐
            │               │
            ▼               ▼
      [Retake]         [Dashboard]
            │               │
            ▼               ▼
   [/app/assessment/start]  [/app/dashboard]
```

### Admin Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

[/admin/login] ──────────────────────────────► [/admin/dashboard]
                                                       │
                                               ┌───────┼───────┐
                                               │       │       │
                                               ▼       ▼       ▼
                                         [/admin/pins] [/admin/admins] [/admin/manage]
                                               │       │
                                               │       │
                                               ▼       ▼
                                          [Rotate PIN] [Create/Delete Admin]
                                               │       │
                                               │       │
                                               └───────┴───► Stays on same page
```

---

## Test Execution Summary

### Quick Reference: Where Each Action Leads

| Current Location | Action | Destination |
|-----------------|--------|-------------|
| `/teacher/start` | Successful Login | `/app/teacher/classes` |
| `/teacher/start` | Complete Registration | `/app/teacher/classes` |
| `/student/start` | Successful Login | `/app/dashboard` |
| `/student/start` | Complete Registration | `/app/dashboard` |
| `/admin/login` | Successful Login | `/admin/dashboard` |
| `/join` | Join Class (logged in) | `/app/student/classes` |
| `/app/assessment/start` | Submit Assessment | `/app/assessment/summary` |
| `/app/assessment/summary` | Retake | `/app/assessment/start` |
| `/app/assessment/summary` | Back to Dashboard | `/app/dashboard` |
| `/app/teacher/classes` | View Roster | `/app/teacher/classes/{id}` |
| `/app/teacher/classes/{id}` | Back | `/app/teacher/classes` |
| Any protected page | Sign Out | `/student/start` or `/teacher/start` |

---

**Guide Version:** 3.0
**Total Test Cases:** 150+
**Last Updated:** December 23, 2025
**Status:** Ready for Comprehensive Testing
