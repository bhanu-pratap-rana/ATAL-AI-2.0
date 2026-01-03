# ATAL AI Architecture Guide

## Overview

ATAL AI is a comprehensive educational platform built with **Next.js 16**, **React 19**, **TypeScript**, and **Supabase**. The system supports role-based access control for students, teachers, and administrators with AI-powered tutoring capabilities.

---

## System Architecture

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (App Router) | 16.0.10 |
| **UI Framework** | React | 19.2.1 |
| **Language** | TypeScript | 5.9.3 |
| **Styling** | Tailwind CSS | 4.0.0 |
| **Auth & Database** | Supabase | Latest |
| **Build Tool** | Turbopack | Bundled with Next.js 16 |
| **Form Validation** | Zod | Latest |
| **Toast Notifications** | Sonner | Latest |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
│                  (User Interface Layer)                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/WebSocket
                       ▼
┌─────────────────────────────────────────────────────────┐
│            Next.js Server (App Router)                   │
│    ┌──────────────────────────────────────────────┐    │
│    │      Client Components (use 'use client')    │    │
│    │  - Authentication Forms                       │    │
│    │  - Dashboard Interfaces                       │    │
│    │  - Assessment Runner                         │    │
│    │  - Interactive Features                      │    │
│    └──────────────────────────────────────────────┘    │
│    ┌──────────────────────────────────────────────┐    │
│    │    Server Components & Server Actions         │    │
│    │  - Database Queries                          │    │
│    │  - Authentication Logic                      │    │
│    │  - Role-Based Access Control                 │    │
│    │  - AI Integration                            │    │
│    │  - Rate Limiting                             │    │
│    └──────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ API Calls / Server Actions
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Backend                            │
│    ┌──────────────────────────────────────────────┐    │
│    │      PostgreSQL Database                      │    │
│    │  - Users & Authentication                     │    │
│    │  - Roles & Permissions                        │    │
│    │  - Student Data                              │    │
│    │  - Assessment Records                        │    │
│    │  - Learning Progress                         │    │
│    │  - Classes & Enrollments                     │    │
│    └──────────────────────────────────────────────┘    │
│    ┌──────────────────────────────────────────────┐    │
│    │      Supabase Auth                            │    │
│    │  - Email/OTP Authentication                   │    │
│    │  - Password Management                        │    │
│    │  - Session Management                         │    │
│    └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Application Structure

```
apps/web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── actions/                  # Server Actions
│   │   │   ├── auth.ts              # Authentication logic
│   │   │   ├── admin-auth.ts        # Admin authentication
│   │   │   ├── admin-management.ts  # Admin user management
│   │   │   ├── dashboard-stats.ts   # Dashboard statistics
│   │   │   ├── assessment.ts        # Assessment operations
│   │   │   └── teacher.ts           # Teacher operations
│   │   │
│   │   ├── api/                      # API Routes
│   │   │   ├── check-auth-config/    # Auth configuration check
│   │   │   ├── teacher/              # Teacher endpoints
│   │   │   ├── tutor/                # AI Tutor endpoints
│   │   │   └── voice/                # TTS voice endpoints
│   │   │
│   │   ├── (auth)/                   # Auth Pages
│   │   │   ├── page.tsx              # Auth choice page
│   │   │   └── ...other auth pages
│   │   │
│   │   ├── admin/                    # Admin Pages
│   │   ├── app/                      # Main App Pages
│   │   │   ├── dashboard/            # User dashboard
│   │   │   ├── assessment/           # Assessment pages
│   │   │   ├── learn/                # Learning modules
│   │   │   ├── settings/             # User settings
│   │   │   ├── progress/             # Progress tracking
│   │   │   ├── teacher/              # Teacher pages
│   │   │   └── ai-tools/             # AI features
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   │
│   ├── components/                   # React Components
│   │   ├── ui/                       # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (more UI primitives)
│   │   │
│   │   ├── form/                     # Form components
│   │   │   ├── FormError.tsx         # Reusable error display
│   │   │   ├── FormInput.tsx
│   │   │   └── ...
│   │   │
│   │   ├── admin/                    # Admin-specific components
│   │   │   ├── AdminDeleteDialog.tsx
│   │   │   ├── AdminResetPasswordDialog.tsx
│   │   │   ├── RoleGuard.tsx         # Role-based access control
│   │   │   └── ...
│   │   │
│   │   ├── assessment/               # Assessment components
│   │   │   ├── AssessmentRunner.tsx  # Main assessment UI
│   │   │   ├── AssessmentSkeleton.tsx
│   │   │   └── ...
│   │   │
│   │   ├── teacher/                  # Teacher components
│   │   ├── student/                  # Student components
│   │   └── ...
│   │
│   ├── hooks/                        # React Hooks
│   │   ├── useAuthState.ts           # DEPRECATED - Use focused hooks below
│   │   ├── useAuthStateRefactored.ts # Composes focused auth hooks
│   │   ├── useValidationHandler.ts   # Form validation hook
│   │   ├── auth/                     # Focused auth hooks
│   │   │   ├── useSignInState.ts     # Email/phone/username sign-in
│   │   │   ├── useSignUpState.ts     # Email/phone/guest/username sign-up
│   │   │   ├── useForgotPasswordState.ts
│   │   │   ├── useProfileSetupState.ts
│   │   │   └── useJoinClassState.ts
│   │   └── ...
│   │
│   ├── lib/                          # Utilities & Libraries
│   │   ├── auth/                     # Auth utilities
│   │   │   ├── role-utils.ts         # Server-side role checking (26+ functions)
│   │   │   └── role-utils-client.ts  # Client-side role checking
│   │   │
│   │   ├── form-handler-factory.ts   # Form submission pattern factory
│   │   ├── email-validation.ts
│   │   ├── password-validation.ts
│   │   ├── rate-limiter-distributed.ts
│   │   ├── supabase-browser.ts       # Supabase client
│   │   ├── supabase-server.ts        # Supabase server
│   │   ├── client-logger.ts          # Client-side logging
│   │   └── constants/
│   │       ├── ui-timings.ts
│   │       └── ...
│   │
│   └── middleware.ts                 # Next.js Middleware
│
├── tests/                            # Test files
│   ├── e2e-automated/               # Playwright E2E tests
│   │   ├── section-0xx/             # Auth tests
│   │   ├── section-1xx/             # Feature tests
│   │   └── ...
│   └── ...
│
└── package.json                      # Project dependencies
```

---

## Authentication Flow

### Email/OTP Sign-Up Flow

```
User                    Client Component      Server Action        Supabase
 │                             │                      │                │
 ├─ Enters email ──────────> FormInput              │                │
 │                             │                      │                │
 ├─ Clicks "Send OTP" ───────> requestOtp() ────────> (Validate)      │
 │                             │                      │                │
 │                             │                      ├─ Check rate limit
 │                             │                      │                │
 │                             │                      ├─ Check domain ─> Check email exists
 │                             │                      │                │
 │                             │                      ├─────────────────> signInWithOtp()
 │                             │                      │<──────────────────
 │                             │<───────────────────────
 │<──── Success toast ────────────
 │
 ├─ Enters OTP ───────────> verifyOtp() ────────────> (Validate OTP)   │
 │                             │                      │                │
 │                             │                      ├────────────────> verifyOtp()
 │                             │                      │<────────────────
 │                             │<───────────────────────
 │<──── Redirect to dashboard ──
```

### Role-Based Access Control

```
Authenticated User
       │
       ├─ Session established (Supabase Auth)
       │
       ├─ app_metadata.role extracted
       │       ├─ "student"      (Level 0)
       │       ├─ "teacher"      (Level 1)
       │       ├─ "admin"        (Level 2)
       │       └─ "super_admin"  (Level 3)
       │
       ├─ RoleGuard component checks permission
       │
       ├─ If authorized:  Render page
       └─ If not:         Show access denied
```

---

## State Management Architecture

### Authentication State (Refactored)

The original 671-line `useAuthState` hook was refactored into **5 focused hooks** with a composition layer:

```
┌─────────────────────────────────────────────────────┐
│     useAuthStateRefactored (Composition Layer)      │
│         ↓      ↓       ↓        ↓        ↓         │
├────────────────────────────────────────────────────┤
│ useSignInState  │ useSignUpState  │ useForgotPassword │
│   (140 lines)   │   (245 lines)   │    (85 lines)    │
│   ├─ email      │   ├─ email      │    ├─ email      │
│   ├─ phone      │   ├─ phone      │    ├─ otp        │
│   └─ username   │   ├─ guest      │    └─ newPassword │
│                 │   └─ username   │                   │
├────────────────────────────────────────────────────┤
│ useProfileSetupState │ useJoinClassState           │
│    (95 lines)        │    (55 lines)               │
│  ├─ name             │ ├─ classCode                │
│  ├─ gender           │ └─ pin                      │
│  ├─ rollNumber       │                             │
│  ├─ phone            │                             │
│  ├─ school           │                             │
│  └─ village          │                             │
└─────────────────────────────────────────────────────┘
```

**Benefits:**
- Each hook is independently testable
- Clear separation of concerns
- Easy to reuse specific flows
- 100% backward compatible with original interface

### Form Validation & Error Handling

```
Component
    │
    ├─ useValidationHandler() hook
    │   ├─ state: { isLoading, error, success }
    │   ├─ handle: async (e?: FormEvent) => void
    │   └─ clearError: () => void
    │
    ├─ <FormError error={state.error} />
    │
    └─ createFormHandler() factory
        ├─ Validates input
        ├─ Manages loading state
        ├─ Handles errors
        └─ Calls success callback
```

---

## Role Hierarchy & Authorization

### Role Levels

```
super_admin (Level 3) ─┐
                       ├─ Can access all areas
admin (Level 2) ───────┤
                       ├─ Can access admin + teacher areas
teacher (Level 1) ─────┤
                       ├─ Can access teacher + student areas
student (Level 0) ─────┘
```

### Role Checking Utility Functions

Located in `src/lib/auth/role-utils.ts` (26+ functions):

```typescript
// Basic checks
isTeacherOrHigher(role)  // Checks: teacher | admin | super_admin
isAdmin(role)            // Checks: admin | super_admin
isSuperAdmin(role)       // Checks: super_admin only

// Advanced checks
hasMinimumRole(role, minimumRole)
getRoleFromMetadata(user)
filterUsersByRole(users, role)
canUserManageRole(userRole, targetRole)
// ... and 20+ more specialized checks
```

---

## Database Schema (Key Tables)

```
auth.users (Supabase)
├─ id: uuid (PK)
├─ email: string
├─ app_metadata.role: string (student|teacher|admin|super_admin)
└─ auth_session

public.users_extended
├─ id: uuid (FK → auth.users.id)
├─ role: string
├─ phone: string
├─ school_id: uuid
└─ created_at: timestamp

public.student_profiles
├─ id: uuid
├─ user_id: uuid (FK)
├─ name: string
├─ gender: string
├─ roll_number: string
├─ village: string
└─ updated_at: timestamp

public.teacher_profiles
├─ id: uuid
├─ user_id: uuid (FK)
├─ school_id: uuid
├─ subject: string
└─ created_at: timestamp

public.classes
├─ id: uuid (PK)
├─ class_code: string (6-char, unique)
├─ join_pin: string (4-digit, unique)
├─ teacher_id: uuid (FK)
├─ subject: string
├─ name: string
└─ created_at: timestamp

public.student_class_enrollments
├─ id: uuid
├─ student_id: uuid (FK)
├─ class_id: uuid (FK)
├─ roll_number: string
└─ enrolled_at: timestamp

public.assessments
├─ id: uuid
├─ class_id: uuid (FK)
├─ name: string
├─ description: text
├─ total_questions: integer
├─ passing_percentage: integer
└─ created_at: timestamp

public.assessment_sessions
├─ id: uuid
├─ assessment_id: uuid (FK)
├─ student_id: uuid (FK)
├─ status: string (in_progress|completed|abandoned)
├─ score: integer
├─ started_at: timestamp
└─ completed_at: timestamp
```

---

## Key Features

### 1. **Multi-Role Authentication**
- Email/OTP-based authentication
- Phone-based sign-up
- Guest access via class code + PIN
- Username-based authentication
- Email domain validation
- Rate limiting (1 OTP per hour per email)

### 2. **Role-Based Access Control (RBAC)**
- Server-side enforcement via middleware
- Client-side guards for UI
- Centralized role checking utilities
- Hierarchical role system

### 3. **Assessment System**
- Adaptive question selection
- Real-time progress tracking
- Score calculation
- Session management
- Assessment templates

### 4. **Class Management**
- Teachers create classes
- Unique class codes (6-character)
- Secure PIN-based joining (4-digit)
- Student enrollment tracking
- Roll number management

### 5. **AI Tutor Integration**
- Claude API integration
- Real-time chat with context
- Learning module support
- Personalized assistance

### 6. **Data Security**
- Sensitive role data masked in logs
- Rate limiting prevents brute force
- Email domain validation
- OTP expiration
- Secure session management
- CORS/CSRF protection
- CSP headers

---

## Code Deduplication & Refactoring (Phase 1)

### Completed Improvements

#### 1. Role Checking Consolidation
- **From:** 26+ duplicate role checks scattered across 15 files
- **To:** 26 utility functions in `role-utils.ts` + client mirrors
- **Impact:** Single source of truth, prevents authorization bugs

#### 2. Form Validation & Error Handling
- **From:** 30+ instances of repeated validation pattern
- **To:** `useValidationHandler` hook + `createFormHandler` factory
- **Impact:** Reduced boilerplate by 87.5%

#### 3. Authentication State Management
- **From:** Single 671-line `useAuthState` god-object
- **To:** 5 focused hooks (~150 lines each) composed together
- **Impact:** Improved testability, maintainability, code reuse

#### 4. Error Display Components
- **From:** 13+ instances of repeated error rendering
- **To:** `FormError` family of components
- **Impact:** Consistent error UX, DRY principle

#### 5. Logging Standardization
- **From:** Inconsistent `console.error` usage
- **To:** Unified `authLogger` and `clientLogger`
- **Impact:** Better error tracking, sensitive data masking

---

## Performance Optimizations

### 1. **Bundle Size Reduction**
- Focused auth hooks allow lazy loading specific flows
- Tree-shaking eliminates unused code
- Turbopack ensures fast builds (8-9 seconds)

### 2. **Form Submission Optimization**
- Centralized form handler factory reduces redundant code
- Prevents unnecessary re-renders
- Efficient error state management

### 3. **Rate Limiting**
- `rate-limiter-distributed.ts` with Redis fallback
- Prevents brute force attacks
- In-memory fallback ensures availability during Redis outages

### 4. **Database Query Optimization**
- Indexed fields on frequently filtered columns
- Efficient role hierarchy checks
- Minimal data fetching per request

---

## Testing Strategy

### Unit Tests
- Utility functions (validators, role checkers)
- Custom hooks in isolation
- Server actions with mocked Supabase

### Integration Tests
- Component + hook integration
- Form submission flows
- Authentication sequences

### E2E Tests (Playwright)
- Full user journeys
- Role-based access control
- Assessment completion flows
- Admin management operations
- 40+ test cases covering:
  - Student authentication (Sections 1-10)
  - Teacher workflows (Sections 11-21)
  - Admin operations (Sections 22-30)
  - System features (Sections 31-38)

---

## Deployment Checklist

- [ ] Environment variables configured (.env.local)
- [ ] Supabase project set up and connected
- [ ] Database migrations applied
- [ ] Email domain validation rules verified
- [ ] Rate limiting thresholds configured
- [ ] CORS origins configured
- [ ] CSP headers set appropriately
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] E2E tests passing
- [ ] Performance metrics acceptable
- [ ] Error logging configured
- [ ] Analytics enabled (optional)

---

## Known Limitations & Future Improvements

### Current Limitations
1. **Redis Dependency:** Rate limiter falls back to in-memory if Redis unavailable
2. **Email Domain Validation:** Static list of blocked domains may need updates
3. **OTP Validity:** 10-minute window may be too strict for some users
4. **Assessment Timing:** No enforcement of timed assessments

### Planned Enhancements
1. Real-time notifications using WebSockets
2. Advanced analytics dashboard
3. Bulk user import for schools
4. Assessment templates and question banks
5. Parent/guardian portal
6. Mobile app version
7. Offline assessment support

---

## Troubleshooting Guide

### Common Issues

#### "Email already registered"
- **Cause:** User account exists with different role
- **Solution:** Use appropriate login page (student/teacher/admin)

#### "Rate limit exceeded for OTP"
- **Cause:** More than 1 OTP request in 1-hour window
- **Solution:** Wait 1 hour before requesting again

#### "Invalid email domain"
- **Cause:** Email from blocked/disposable email provider
- **Solution:** Use corporate or mainstream email provider

#### "Failed to create class"
- **Cause:** Database connection issue or insufficient permissions
- **Solution:** Ensure user is authenticated teacher/admin

#### "Assessment session expired"
- **Cause:** Inactive for extended period (>30 minutes typically)
- **Solution:** Start new assessment session

---

## Contributing Guidelines

When adding new features:

1. **Use existing utilities** - Check `role-utils.ts`, `form-handler-factory.ts`
2. **Follow patterns** - Use focused hooks for state management
3. **Reuse components** - Leverage `FormError`, Button, Input components
4. **Add JSDoc** - Document new functions with @param, @returns
5. **Test thoroughly** - Add unit + E2E tests
6. **Check logging** - Use `authLogger` or `clientLogger` instead of console

---

## Contact & Support

For questions or issues, please refer to:
- Project documentation
- Code comments and JSDoc
- GitHub Issues (if applicable)
- Team lead contact

---

**Last Updated:** January 2026
**Architecture Version:** 2.0 (Post-Refactoring Phase 1)
**Maintainer:** Development Team
