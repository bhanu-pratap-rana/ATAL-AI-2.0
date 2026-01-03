# QA Manual Test Checklist - ATAL AI

**Purpose**: Tests that cannot be automated (external services, email/SMS, QR codes)
**Frequency**: Before each production release
**Effort**: 4-6 hours
**Owner**: QA Team / Product Manager

---

## 1. Account Creation & Email OTP Verification

### Test Case 1.1: Student Account Creation with Email OTP
**Status**: 🔒 MANUAL ONLY (Email is external service)

**Prerequisites**:
- Access to a test email account (e.g., atal-test-student@gmail.com)
- Web browser with email access
- Fresh user not yet registered

**Steps**:
1. Navigate to application home page
2. Click "Sign Up as Student" or equivalent
3. Fill form with test email: `atal-test-student+{timestamp}@gmail.com`
   - Example: `atal-test-student+20260101120000@gmail.com`
4. Fill password: `TestPassword@123`
5. Fill full name: `Test Student`
6. Select a school (if required)
7. Click "Send OTP"
8. **[Manual Step]** Open Gmail inbox
9. **[Manual Step]** Find email from ATAL AI with subject "Verify your email"
10. **[Manual Step]** Copy OTP from email (6-digit code)
11. Return to app and paste OTP in the field
12. Click "Verify"
13. **[Automated]** Verify redirected to student dashboard
14. **[Automated]** Verify email in profile shows correct email

**Expected Result**: ✅
- OTP received in email within 2 minutes
- OTP is 6 digits
- OTP is valid for 15 minutes
- Account created successfully
- Can login with email and password

**Failure Scenarios**:
- ❌ Email not received → Check spam folder, verify email address
- ❌ OTP invalid → Request new OTP, check expiration time
- ❌ Account creation fails → Check error message, verify form data

---

### Test Case 1.2: Teacher Account Creation with Email OTP
**Status**: 🔒 MANUAL ONLY (Email is external service)

**Prerequisites**:
- Access to a test email account (e.g., atal-test-teacher@gmail.com)
- Browser with email access
- Fresh teacher email

**Steps**:
1. Navigate to application home page
2. Click "Sign Up as Teacher"
3. Fill form with test email: `atal-test-teacher+{timestamp}@gmail.com`
4. Fill password: `TestPassword@123`
5. Fill full name: `Test Teacher`
6. Select a school
7. Fill school PIN (from admin dashboard)
8. Click "Send OTP"
9. **[Manual Step]** Open Gmail and copy OTP
10. Return to app and enter OTP
11. Click "Verify"
12. Complete teacher onboarding (setup classes, etc.)
13. Verify can access teacher dashboard

**Expected Result**: ✅
- OTP received
- Teacher account created
- Can access teacher dashboard
- Can create classes

---

### Test Case 1.3: Admin Account Creation
**Status**: 🔒 MANUAL ONLY (Only super admin can create)

**Prerequisites**:
- Super admin access
- Test email address
- Browser

**Steps**:
1. Login as super admin
2. Navigate to Admin Management
3. Click "Create New Admin"
4. Fill email: `atal-test-admin@gmail.com`
5. Select role: "School Admin" or "Super Admin"
6. Click "Send Invite"
7. **[Manual Step]** Open email and check for invite link
8. Click invite link
9. Set password: `TestPassword@123`
10. Click "Confirm"
11. Verify can login as new admin

**Expected Result**: ✅
- Invite email received
- Admin account created
- Can login with new credentials
- Has correct permissions for assigned role

---

## 2. Password Reset via Email

### Test Case 2.1: Forgot Password Flow
**Status**: 🔒 MANUAL ONLY (Email link verification)

**Prerequisites**:
- Existing student/teacher account
- Email access for that account
- Browser

**Steps**:
1. Navigate to login page
2. Click "Forgot Password"
3. Enter email address of existing account
4. Click "Send Reset Link"
5. **[Manual Step]** Open email inbox
6. **[Manual Step]** Find email with subject "Reset your password"
7. **[Manual Step]** Click the reset link in email
8. App opens to reset password form
9. Enter new password: `NewPassword@123`
10. Confirm password
11. Click "Reset Password"
12. Verify success message
13. **[Automated]** Try login with old password → Should fail
14. **[Automated]** Try login with new password → Should succeed

**Expected Result**: ✅
- Reset link received in email
- Link valid for 24 hours
- Can set new password
- Old password no longer works
- New password works for login

**Failure Scenarios**:
- ❌ Email not received → Check spam, verify email in system
- ❌ Link expired → Reset password again (link expires after 24h)
- ❌ Password change fails → Check password requirements

---

## 3. Student Joining Class via QR Code

### Test Case 3.1: Scan Class QR Code (Mobile)
**Status**: 🔒 MANUAL ONLY (QR code scanning)

**Prerequisites**:
- Teacher account with created class
- Generated class QR code
- Mobile device with camera
- Student account (or student using guest login)

**Steps**:
1. Teacher navigates to class details
2. **[Automated]** Verify QR code is displayed
3. Click "Copy Class Code" button → Verify 6-character code copied
4. **[Manual Step]** Open student device and open camera
5. **[Manual Step]** Point camera at QR code on desktop
6. **[Manual Step]** Tap the notification that appears
7. App opens with class join page
8. Verify class name and teacher name shown
9. Click "Join Class"
10. Verify student added to class roster (on teacher side)

**Expected Result**: ✅
- QR code is scannable
- Opens app to class join page
- Student successfully joins class
- Student appears in class roster
- Student can see class materials

---

### Test Case 3.2: Join Class with Class Code
**Status**: ✅ AUTOMATABLE

**Prerequisites**:
- Student logged in
- Teacher class created
- Class code available

**Steps**:
1. **[Automated]** Student navigates to "Join Class"
2. **[Automated]** Fill class code (6-digit code)
3. **[Automated]** Verify class details shown
4. **[Automated]** Click "Join"
5. **[Automated]** Verify redirected to class view
6. **[Automated]** Verify class appears in student's class list

**Expected Result**: ✅ (Fully automated)

---

## 4. Email Notifications

### Test Case 4.1: Teacher Posts Assignment - Student Gets Email
**Status**: 🔒 MANUAL ONLY (External email service)

**Prerequisites**:
- Teacher account with class
- Students enrolled in class (with valid emails)
- Assignment/material ready to post

**Steps**:
1. **[Automated]** Teacher logs in
2. **[Automated]** Opens class
3. **[Automated]** Creates and posts new assignment
4. **[Manual Step]** Check student email inbox
5. **[Manual Step]** Verify email received with subject "New Assignment: [Assignment Name]"
6. **[Manual Step]** Verify email contains:
   - Assignment title
   - Due date (if any)
   - Link to assignment
   - Teacher name
7. **[Manual Step]** Click link in email
8. **[Automated]** Verify app opens to assignment page

**Expected Result**: ✅
- Email received within 1 minute
- Contains all required information
- Link opens assignment in app
- Email formatting looks professional
- No duplicate emails sent

---

### Test Case 4.2: Grade Posted - Student Gets Email
**Status**: 🔒 MANUAL ONLY (External email service)

**Prerequisites**:
- Student with submitted assessment
- Teacher has graded the assessment

**Steps**:
1. **[Automated]** Teacher grades student's assessment
2. **[Manual Step]** Check student email
3. **[Manual Step]** Verify email received: "Grade Posted: [Assessment]"
4. **[Manual Step]** Verify email shows:
   - Score/grade
   - Feedback (if provided)
   - Link to see detailed results
5. **[Manual Step]** Click link and verify can see assessment results

**Expected Result**: ✅
- Email received
- Shows grade/score
- Can view results from link

---

### Test Case 4.3: Notification Preferences - Opt Out
**Status**: 🔒 MANUAL ONLY (Email delivery)

**Prerequisites**:
- Student account
- Email preferences/settings

**Steps**:
1. **[Automated]** Student opens Settings → Notifications
2. **[Automated]** Toggle "Email Notifications" OFF
3. **[Automated]** Save settings
4. **[Automated]** Teacher posts new assignment
5. **[Manual Step]** Check student email inbox
6. **[Manual Step]** Verify NO email received (wait 2 minutes)
7. **[Automated]** Toggle notifications back ON
8. **[Automated]** Teacher posts another assignment
9. **[Manual Step]** Verify email IS received

**Expected Result**: ✅
- Can toggle notifications on/off
- Respects user preferences
- No emails when opted out
- Emails resume when opted in

---

## 5. SMS/WhatsApp Notifications (If Implemented)

### Test Case 5.1: SMS Alert Sent to Teacher
**Status**: 🔒 MANUAL ONLY (External SMS service)

**Prerequisites**:
- Teacher with verified phone number
- SMS notifications enabled

**Steps**:
1. **[Automated]** Trigger event (e.g., student joins class)
2. **[Manual Step]** Check teacher's phone for SMS
3. **[Manual Step]** Verify SMS received within 1 minute
4. **[Manual Step]** Verify message content and link works

**Expected Result**: ✅
- SMS received promptly
- Contains key information
- Links are accessible from SMS

---

## 6. Admin PIN Management

### Test Case 6.1: Generate School PIN
**Status**: ✅ AUTOMATABLE (No external dependency)

**Prerequisites**:
- Admin logged in
- School selected

**Steps**:
1. **[Automated]** Admin navigates to PIN Management
2. **[Automated]** Click "Generate PIN"
3. **[Automated]** Verify 4-digit PIN displayed
4. **[Automated]** Verify PIN copied to clipboard
5. **[Automated]** Verify PIN saved in system

**Expected Result**: ✅ (Fully automated)

---

### Test Case 6.2: PIN Rotation
**Status**: 🔒 MANUAL ONLY (Verify physical sharing)

**Prerequisites**:
- School with active PIN
- Teachers need to know new PIN

**Steps**:
1. **[Automated]** Admin navigates to PIN Management
2. **[Automated]** Selects school with current PIN
3. **[Automated]** Clicks "Rotate PIN"
4. **[Automated]** New PIN generated and displayed
5. **[Manual Step]** Admin communicates new PIN to school (email/message)
6. **[Automated]** Teacher uses new PIN for new account registration
7. **[Automated]** Verify teacher account created with new PIN
8. **[Manual Step]** Verify old PIN no longer works

**Expected Result**: ✅
- New PIN generated
- Old PIN disabled
- Teachers can register with new PIN
- No duplicate or invalid PINs issued

---

## 7. Browser Compatibility Testing

### Test Case 7.1: Chrome/Edge (Chromium)
**Status**: ✅ AUTOMATABLE (Playwright uses Chromium)

**Tests**:
- All automated tests run in Chrome
- Verify no console errors
- Verify responsive design works

---

### Test Case 7.2: Firefox
**Status**: 🔒 MANUAL ONLY (Not in CI/CD)

**Steps**:
1. Install Firefox browser
2. Navigate to application
3. Perform core user journeys:
   - Student login → view dashboard → take assessment
   - Teacher login → create class → manage students
   - Admin login → manage schools and pins
4. Verify no console errors
5. Check all features work
6. Verify responsive design

**Expected Result**: ✅
- No JavaScript errors
- All features work
- Forms submit correctly
- Navigation works smoothly

---

### Test Case 7.3: Safari (Mac/iOS)
**Status**: 🔒 MANUAL ONLY (Apple devices required)

**Prerequisites**:
- Mac or iPhone/iPad with Safari

**Steps**:
1. Navigate to application
2. Test core user journeys
3. Check form inputs
4. Verify responsive design
5. Test touch interactions (if on mobile)

**Expected Result**: ✅
- Works smoothly on Safari
- No layout issues
- Touch events work on iOS

---

## 8. Mobile Device Testing

### Test Case 8.1: Android Mobile
**Status**: 🔒 MANUAL ONLY (Physical device)

**Prerequisites**:
- Android phone
- Chrome or Firefox browser

**Steps**:
1. Navigate to application
2. Student flow:
   - Login
   - View dashboard
   - Take assessment (scrolling, selecting answers)
   - Submit assessment
3. Teacher flow:
   - Login
   - Create class
   - View class roster
4. Admin flow:
   - Login
   - Manage schools
   - Manage pins

**Expected Result**: ✅
- All features work on mobile
- Text is readable
- Buttons are clickable
- No layout overflow
- Responsive design working

---

### Test Case 8.2: iOS Mobile
**Status**: 🔒 MANUAL ONLY (Physical device)

**Prerequisites**:
- iPhone or iPad
- Safari browser

**Steps**:
1. Same as Android test
2. Plus:
   - Test touch gestures
   - Check keyboard appearance
   - Verify PWA behavior

**Expected Result**: ✅
- Same as Android
- iOS-specific issues resolved

---

## 9. Network Conditions

### Test Case 9.1: Slow Network (3G)
**Status**: ⚠️ PARTIALLY AUTOMATABLE

**Automated Part**:
```bash
# Use Chrome DevTools throttling
npm run test:e2e -- --headed  # Then use DevTools
```

**Manual Verification**:
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Slow 3G"
4. Reload page
5. Verify app still works:
   - Pages load (slow but functional)
   - Forms can be submitted
   - No timeouts

**Expected Result**: ✅
- App functional on slow networks
- Shows loading states
- Doesn't timeout prematurely

---

### Test Case 9.2: Offline Mode (PWA)
**Status**: 🔒 MANUAL ONLY (Complex offline testing)

**Prerequisites**:
- PWA installed on home screen (if applicable)
- Device with offline capability

**Steps**:
1. **[Automated]** Student takes assessment (online)
2. **[Manual Step]** Turn off network (Airplane mode)
3. **[Manual Step]** Try to access app
4. **[Manual Step]** Verify offline page/mode shown
5. **[Manual Step]** If PWA: Verify can open cached pages
6. **[Manual Step]** Turn network back on
7. **[Automated]** Verify data syncs

**Expected Result**: ✅
- App handles offline gracefully
- Shows offline message
- Doesn't crash
- Resumes when online

---

## 10. Accessibility Testing

### Test Case 10.1: Keyboard Navigation
**Status**: ✅ AUTOMATABLE (Playwright can simulate keyboard)

**Automated Tests**:
- Tab through all form fields
- Enter activates buttons
- Escape closes modals
- Arrow keys navigate lists

---

### Test Case 10.2: Screen Reader Testing
**Status**: 🔒 MANUAL ONLY (Requires physical screen reader)

**Prerequisites**:
- Screen reader software (NVDA, JAWS, VoiceOver)
- Accessibility testing experience

**Steps**:
1. Enable screen reader
2. Navigate through app
3. Verify:
   - Headings are announced
   - Form labels are clear
   - Buttons are descriptive
   - Images have alt text
   - Links have meaningful text
4. Take assessment:
   - Questions are readable
   - Options are selectable
   - Progress is announced

**Expected Result**: ✅
- App is screen-reader friendly
- Content is understandable
- Navigation is logical
- No "unlabeled" warnings

---

### Test Case 10.3: Color Contrast
**Status**: ✅ AUTOMATABLE (Using axe or similar)

**Automated Tests**:
```bash
npm run test:e2e -- --headed  # Then use axe DevTools extension
```

**Manual Check**:
1. Install aXe DevTools Chrome extension
2. Run scan on all pages
3. Verify no contrast violations
4. Verify WCAG AA compliance

**Expected Result**: ✅
- All text has sufficient contrast (at least 4.5:1)
- WCAG AA compliant
- No color-only information

---

## Test Execution Checklist

### Before Testing
- [ ] Test environment is set up
- [ ] Test accounts created with test emails
- [ ] Test data seeded in database
- [ ] Email service is accessible
- [ ] SMS service (if used) is accessible
- [ ] Network is stable
- [ ] All browsers/devices ready

### During Testing
- [ ] Document all issues found
- [ ] Take screenshots of failures
- [ ] Note exact steps to reproduce
- [ ] Record any error messages
- [ ] Test each scenario completely

### After Testing
- [ ] Create bug report for failures
- [ ] Verify fixes in next build
- [ ] Sign off on release
- [ ] Archive test results

---

## Known Limitations & Workarounds

### Email Testing
**Limitation**: Can't fully automate email verification
**Workaround**:
- Use test email service (temp email, disposable email)
- Check email programmatically via API if available
- Create mock email for testing

### QR Code Testing
**Limitation**: Can't scan QR codes in automated tests
**Workaround**:
- Display QR code, verify it's readable
- Test class code joining instead
- Manual QR testing before release

### SMS Testing
**Limitation**: External service, hard to mock
**Workaround**:
- Use SMS API testing tools if available
- Manual testing with test phone
- Mock SMS in staging environment

---

## Recommended Tools

### Email Testing
- **MailHog**: Local SMTP server for development
- **Mailtrap**: Email testing service
- **Gmail API**: Read emails programmatically

### Device Testing
- **Chrome DevTools**: Mobile emulation
- **BrowserStack**: Real device testing
- **Sauce Labs**: Cloud device testing

### Accessibility
- **aXe DevTools**: Chrome extension
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Built into Chrome DevTools

---

## Team Communication

### When to Run Manual Tests
- [ ] Before each production release
- [ ] When email/notification features change
- [ ] When accessibility features are added
- [ ] When new browsers need to be supported
- [ ] Before major version releases

### Issues Found
- Create ticket with:
  - Test case name
  - Exact steps to reproduce
  - Expected vs actual result
  - Screenshots/video
  - Browser/device used
  - Severity level

---

**Last Updated**: December 31, 2025
**Next Review**: January 31, 2026
**Owner**: QA Team
