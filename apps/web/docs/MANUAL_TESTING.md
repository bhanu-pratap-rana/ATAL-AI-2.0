# Manual Testing Guide — ATAL AI Pre-Launch

Everything automatable is covered by the Playwright gate (`npm run test:e2e:full`,
101 tests). This guide covers the 8 areas that **require a human, a physical
device, or a judgment call**. Run it once on staging/production URL before
launch, and after any change to auth, voice, or PWA plumbing.

## Before You Start

| Prep | Detail |
|---|---|
| Devices | 1 Android phone (ideally a low-end model, ≤2 GB RAM), 1 second phone for SMS/WhatsApp, your laptop |
| Accounts | A **real** personal email you can check (inbox + spam), a **real** Indian mobile number (+91) |
| Demo accounts | demo.student@atal.com / demo.teacher@atal.com / demo.admin@atal.com (passwords in the launch vault) |
| Network | Wi-Fi **and** mobile data; for the 2G/3G test use Chrome DevTools throttling or a real weak-signal location |
| Print | One class-invite QR poster printed at the size you'll actually distribute |

Record results in the checklist at the bottom. **Fail = block launch; Degraded = note and decide.**

---

## 1. Real SMS OTP (Indian number)

Automation proves the request pipeline; only a real phone proves delivery.

1. Log out. Start the student sign-up/login flow that requests an OTP.
2. Enter your real +91 number. Start a stopwatch when you tap send.
3. **Check:** SMS arrives in **< 60 s** (note the actual time). Sender ID looks legitimate (not a random long code, if a DLT sender ID is configured).
4. Enter the code — login must complete.
5. Tap "resend" once. Second SMS must arrive; the **first code must be rejected** after the second is issued (or per your policy — verify it matches).
6. Enter a wrong code 3–5 times — expect a clear error, then rate-limiting (the app enforces OTP rate limits; confirm the user-facing message is understandable, not a raw error).
7. Repeat once on **mobile data** instead of Wi-Fi (some carriers deliver differently under CGNAT).

**Failure triage:** Supabase Dashboard → Auth → Logs; SMS provider dashboard (delivery receipts); check quota/DLT registration for Indian carriers.

## 2. Email Deliverability

1. Sign up with your real personal email (Gmail **and**, if possible, one non-Gmail).
2. **Check:** verification email arrives **in the inbox, not spam**, within 2 min.
3. Open on the phone — links must work from the phone's mail app, not just desktop.
4. Trigger **password reset** (`/reset-password` flow) — same checks: inbox, < 2 min, link opens the reset form, new password works.
5. Look at the emails critically: sender name, subject, no broken images, no "via supabase.io" style headers if you configured a custom SMTP domain.

**Failure triage:** if mail lands in spam, verify SPF/DKIM/DMARC on the sending domain; check Supabase Auth → Email Templates and SMTP settings.

## 3. Voice Quality — STT and TTS (Hindi / Assamese)

The suite proves the plumbing responds; only ears judge quality. Do this with a native or fluent speaker if you can.

**TTS (listen):**
1. As demo student, open a lesson (`/app/learn/M1/T1.1`), switch language to **हिंदी**, play the audio.
2. **Check:** natural pacing, correct pronunciation of technical words (e.g., "कंप्यूटर"), no clipped starts/ends, volume consistent between chunks.
3. Repeat in **অসমীয়া** — Assamese is the higher-risk voice; listen for wrong phonemes or Bengali-sounding pronunciation.
4. Play on the phone's **loudspeaker** (classroom scenario) — still intelligible?

**STT (speak):**
5. Open the AI tutor (`/app/ai-tools/tutor`), use the mic button.
6. Speak a question in Hindi with normal classroom background noise. **Check:** transcription is faithful enough that the tutor answers the *intended* question.
7. Repeat in Assamese and in Indian-accented English.
8. Test mic permission denial: block the mic in browser settings → the UI must show a helpful message, not hang.

**Pass bar:** a student who can't read well could use voice alone to get through a lesson. If Assamese TTS is rough but intelligible, mark **Degraded**, not Fail.

## 4. QR Scan (physical phone + printed poster)

1. As demo teacher, open a class → Invite panel → display the QR.
2. Scan **off the laptop screen** with the phone's native camera app (not a QR app). **Check:** opens `/join` with the class pre-filled; joining as a logged-out user routes through signup and lands in the class.
3. Scan the **printed poster**: at arm's length, under classroom-ish lighting, and once at a slight angle. All must scan in < 3 s.
4. Check the poster itself: class name legible, instructions understandable to a parent, no cut-off margins.

## 5. WhatsApp Share

1. In the teacher Invite panel, tap the WhatsApp share button (uses a `wa.me` link).
2. **On the phone:** it must open the WhatsApp app (not a browser tab) with the pre-filled message.
3. **Check the message content:** correct class name, working join link, sensible wording in the recipient's language.
4. Send it to your second phone; tap the link there — must land on `/join` with the class code applied, on a phone that has never seen the app.
5. Desktop: same button should open WhatsApp Web without error.

## 6. AI Tutor Answer Quality (pedagogy)

The suite proves the tutor responds; you judge whether the answers *teach*.

Ask each of these as the demo student at `/app/ai-tools/tutor` and rate 1–5:

1. **Curriculum basics:** "What are the four jobs of a computer?" — must align with the lesson content, age-appropriate wording.
2. **Confused student:** "I don't understand anything about this lesson" — should ask a guiding question or simplify, not dump a wall of text.
3. **Wrong premise:** "Why does RAM store files permanently?" — must gently correct, not go along with it.
4. **Homework fishing:** paste an assessment-style question verbatim — should guide toward the answer, not just hand it over (per your tutoring policy).
5. **Hindi and Assamese:** repeat #1 in both — answer should come back in the same language, at the same quality.
6. **Off-topic/safety:** ask something inappropriate for school — must refuse cleanly.

**Pass bar:** average ≥ 4, no single answer that would embarrass you in front of a teacher.

## 7. PWA Install + True Airplane Mode

DevTools offline emulation is already automated; radios-off on real hardware behaves differently (service-worker + IndexedDB under real constraints).

1. On the Android phone (Chrome), log in as demo student, browse 2–3 lessons so they cache.
2. Install: browser menu → "Add to Home screen" / install prompt. **Check:** real app icon (not a generic globe), splash screen, opens standalone without browser chrome.
3. Enable **airplane mode** (not DevTools). Open the installed app.
4. **Check:** app opens; previously-viewed lessons readable; a clear offline indicator appears; uncached areas show the friendly `/offline` experience, not a Chrome dinosaur.
5. Complete a lesson step offline, then disable airplane mode. **Check:** progress syncs (verify on the teacher dashboard from the laptop — the realtime grid should reflect it).
6. Kill and reopen the app while still offline — must still open.

## 8. Low-End Device / 2G-3G Feel

The launch audience skews to budget Androids on weak networks. Numbers from your laptop mean nothing here.

1. Use the lowest-end Android you can get (or Chrome DevTools → Performance → CPU 6× slowdown + Network "Slow 3G" as a floor, on the phone if possible).
2. Cold-load the login page on Slow 3G. Time it. **Check:** something meaningful renders < 10 s; buttons don't shift around as it loads.
3. Log in, open the dashboard and one lesson. **Check:** every tap gives feedback < 300 ms (spinner/skeleton), even if data takes longer; no white-screen periods > 3 s.
4. Play lesson TTS while on 3G — audio should start within a reasonable wait or show progress, not silently fail.
5. Type in the AI tutor on the phone keyboard — no input lag; response streams in rather than blocking.
6. Leave the app open 15 min and navigate around — no crash/reload (memory pressure on 2 GB devices).

---

## Results Checklist

| # | Area | Pass | Degraded | Fail | Notes |
|---|---|---|---|---|---|
| 1 | SMS OTP delivery + resend + rate limit | ☐ | ☐ | ☐ | |
| 2 | Email inbox placement + reset flow | ☐ | ☐ | ☐ | |
| 3 | TTS Hindi | ☐ | ☐ | ☐ | |
| 3 | TTS Assamese | ☐ | ☐ | ☐ | |
| 3 | STT (Hi/As/En-accent) | ☐ | ☐ | ☐ | |
| 4 | QR: screen scan | ☐ | ☐ | ☐ | |
| 4 | QR: printed poster | ☐ | ☐ | ☐ | |
| 5 | WhatsApp share end-to-end | ☐ | ☐ | ☐ | |
| 6 | Tutor pedagogy (avg score: __/5) | ☐ | ☐ | ☐ | |
| 7 | PWA install + airplane mode + sync-back | ☐ | ☐ | ☐ | |
| 8 | Low-end device / Slow-3G feel | ☐ | ☐ | ☐ | |

**Sign-off:** date ______ · tester ______ · device(s) ______ · verdict: LAUNCH / FIX FIRST
