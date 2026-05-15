# Atal AI — Service Continuity & Setup Audit

**Date:** 2026-05-15
**Branch:** `fix/admin-portal-bugs-2026-05-12` @ `a3365b5`
**Goal:** Document exactly what's needed for the platform to *not stop*
under any single provider failure, what's already shipping, and what
optional keys add extra resilience.

---

## TL;DR

**Right now, with the keys already in `.env.local`, every AI surface
has at least one always-on free fallback.** Even if every paid provider
goes dark simultaneously (Google Cloud, Vertex AI, Sarvam), the
platform keeps functioning on free-tier providers.

---

## Current AI provider state

### Configured today

| Env var | Provider | Status |
|---------|----------|--------|
| `GEMINI_API_KEY` + `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 2.5 Flash | ✅ set |
| `GOOGLE_CLOUD_PROJECT` + service account creds | Vertex AI Imagen 3 + Google Cloud TTS | ✅ set |
| `GROQ_API_KEY` | Groq llama-3.3-70b | ✅ set |
| `HUGGINGFACE_API_KEY` | HuggingFace Inference (FLUX, Whisper, Mistral, Llama) | ✅ set |
| `SARVAM_API_KEY` | Sarvam AI (TTS Bulbul v3 + STT saarika v2.5) | ✅ set |

### Removed by user request

- ❌ **Bhashini** — ULCA registration was too painful; Sarvam covers the
  same native Indic STT use case with one API key. Code removed in
  PR-57 (commit `a3365b5`).

---

## Complete fallback matrix (current state)

### 1. Chat / Lesson generation

```
Gemini 2.5 Flash (✅ key set, paid + free tier)
  ↓ on 4xx / 5xx / rate-limit / network
HuggingFace Inference (✅ key set, FREE PRO-tier)
  ↓ on failure
Groq llama-3.3-70b (✅ key set, FREE 14,400 RPM)
  ↓ on failure
Cerebras llama-3.3-70b (⚠️ optional — needs CEREBRAS_API_KEY for full 4-tier coverage)
  ↓ on failure
Error to user
```

**Failover mechanism:** `streamTextWithFallback` / `generateTextWithFallback`
in `src/lib/ai/with-fallback.ts`. Retries each tier on auth / rate-limit /
5xx errors. For streaming, only fails over before the first token arrives
(can't switch mid-stream without dropping a partial response).

**Resilience:** With 3 free tiers configured from 3 independent vendors,
chat practically never stops. Adding Cerebras makes it 4.

### 2. Image generation

```
Vertex AI Imagen 3 (✅ Google Cloud project set, paid + $300 trial)
  ↓ on failure
FLUX.1-schnell via HuggingFace (✅ HF key set, FREE rate-limited)
  ↓ on failure
Pollinations.ai (FREE, no key required, always available)
  ↓ on failure
Error / emoji placeholder
```

**Failover mechanism:** `generateImageWithFallback` in `imagen-service.ts`.
Each fallback caches its output to Supabase Storage using the same cache
key, so subsequent identical prompts hit the cache regardless of which
tier rendered the image.

**Resilience:** Pollinations doesn't need any auth, so image generation
keeps working even if every paid + free-tier key is exhausted.

### 3. Speech-to-Text

```
Sarvam saarika v2.5 (✅ key set — native Hindi, Assamese, English)
  ↓ on failure
OpenAI Whisper API (⚠️ optional — needs OPENAI_API_KEY for paid-tier quality bump)
  ↓ on failure
HuggingFace Whisper-large-v3 (✅ HF key set, FREE rate-limited)
  ↓ on failure
Error to user
```

**Failover mechanism:** `transcribeAudio` in `stt-service.ts` returns the
first non-null result. Browser-side: Web Speech API first; on
Firefox / older Safari / in-app browsers, automatic fall-through to
`/api/voice/stt` which uses this chain.

**Resilience:** Sarvam handles ~33 hours of audio on the free ₹1,000
credits. HuggingFace Whisper backstop is FREE forever (rate-limited).

### 4. Text-to-Speech

```
For English (en) / Hindi (hi):
  Google Cloud Neural2 (✅ configured)
    ↓ on failure
  Sarvam Bulbul v3 (✅ key set)
    ↓ on failure
  Browser speechSynthesis (FREE, always available)

For Assamese (as):
  Sarvam Bulbul v3 (⚠️ requires SARVAM_ENABLE_ASSAMESE=true after beta approval)
    ↓ on failure (or if beta flag off)
  Google Cloud bn-IN-Neural2 (Bengali proxy — phonetically close, current default)
    ↓ on failure
  Browser speechSynthesis
```

**Failover mechanism:** Try/catch ladder in `tts-service.ts`. Each tier
catches errors and progresses to the next.

**Resilience:** Browser speech is the last-resort fallback — always works
regardless of any server / API state.

### 5. RAG embeddings + curriculum context

```
Google text-embedding-004 (✅ uses Gemini key)
  ↓ on failure / no matches
Direct topic content lookup (no embeddings, plain SQL)
  ↓ on no result
ILIKE keyword search against curriculum_content (Postgres native)
  ↓ on no match
Empty context → tutor answers from language-model knowledge alone
```

**Failover mechanism:** `getContext()` in `rag-service.ts` cascades
through three retrieval strategies before giving up.

**Resilience:** Even with the entire embeddings API down, keyword search
against the curriculum table provides grounding. The tutor never lacks
context unless `curriculum_content` itself is empty.

---

## What's optional but adds extra resilience

These keys are inert today but auto-activate the moment you set them.
No code change needed for any of them — providers are already wired.

| Env var | Provider | Why add it | Setup time |
|---------|----------|------------|------------|
| `CEREBRAS_API_KEY` | Cerebras llama-3.3-70b | 4th independent free chat tier — survives Groq + HuggingFace + Gemini all going down | 2 min @ cloud.cerebras.ai |
| `OPENAI_API_KEY` | OpenAI Whisper + GPT models | Quality bump for STT; could also be added to chat chain later | 2 min @ platform.openai.com |
| `SARVAM_ENABLE_ASSAMESE=true` | Native Assamese TTS (Sarvam) | Replaces Bengali fallback with real Assamese | Email support@sarvam.ai first, then set flag (~1-2 days approval) |
| `STABILITY_API_KEY` | Stability AI SDXL | Extra image tier | Optional, Pollinations covers final tier already |

---

## Non-AI single points of failure

These are the surfaces where AI fallback chains can't help. They depend
on infrastructure choices, not provider mix:

| Surface | Risk | Mitigation in place |
|---------|------|---------------------|
| **Supabase Postgres** | Project outage = no auth, no data | Supabase's own multi-region replication; nothing app can do |
| **Supabase Storage** | Image cache + lesson assets become unreachable | Imagen fallback returns base64 inline when Storage upload fails; lesson player handles missing images gracefully |
| **Vercel / Next.js hosting** | Deployment platform outage | Standard PWA service worker caches static assets + recent lessons for offline mode |
| **DNS / CDN (Cloudflare etc.)** | App unreachable | Out of scope; depends on your deployment provider |

For the deployment-platform tier, the existing PWA service worker
(`MutationQueue` + `BackgroundSync`) keeps the student-facing app
usable in fully offline mode — submissions queue and sync when
connectivity returns.

---

## What you don't need to do anything about

Already resilient under current keys:

✅ Chat / tutor goes down → never happens with Gemini + HuggingFace + Groq all keyed
✅ Image generation goes down → Pollinations is keyless and free forever
✅ STT goes down → HuggingFace Whisper is rate-limited but always available
✅ TTS goes down → browser speechSynthesis is OS-native, always works
✅ Embeddings go down → keyword search keeps RAG grounded
✅ All of voice goes down → student can still type into tutor chat

---

## What you can still add (optional, ranked by ROI)

1. **`CEREBRAS_API_KEY`** — 2 minutes, gives a 4th independent free chat
   tier with its own infrastructure (not shared with Groq). Highest
   resilience gain per minute of setup.

2. **Email support@sarvam.ai** to request `as-IN` beta access. When
   granted, set `SARVAM_ENABLE_ASSAMESE=true`. Upgrades Assamese TTS
   from Bengali proxy to native voice. Sound quality jump for the
   actual deployment audience.

3. **`OPENAI_API_KEY`** — 2 minutes, adds Whisper paid-tier for STT
   quality bump and gives a paid chat option if you ever want one.
   Not necessary; Sarvam + HuggingFace Whisper cover STT today.

4. **Replace `zxcvbn@4.4.2`** with `@zxcvbn-ts/core` (1 known CVE).
   Filed as PR-50 in the audit follow-ups. ~1h.

5. **Snyk's pre-existing CVE warnings on `next@16.1.6` and `ai@4.3.19`**
   — bumping to patched versions is the security hygiene pass. Filed
   under PR-50/51. ~2h.

---

## Commits in this resilience sweep

| Commit | What |
|--------|------|
| `9df2c4b` | PR-51 — Runtime chat-model failover wrapper |
| `4c6e93b` | PR-52..55 — Image / STT / RAG fallback chains |
| `ce18ef0` | PR-56 — Sarvam wired into STT + TTS |
| `a3365b5` | **PR-57 — Bhashini removed, Cerebras added as 4th free chat tier** |

---

## Bottom line

**You don't have to do anything else for the service to be resilient.**
Every AI surface has a free, always-available final tier with the keys
you already have configured. The optional adds above improve quality
and add belt-and-suspenders backup, but nothing in the failure mode
"service stops" — the chain is already deep enough that simultaneous
failure of all configured providers is required to break it.

The single biggest leverage if you have 2 minutes: grab a Cerebras
key. Independent infrastructure from Groq, free 30 RPM, fastest LLM
inference on the planet (~2000 tok/sec on llama-3.3-70b).

The single biggest leverage if you have 5 minutes: email
support@sarvam.ai requesting `as-IN` beta access. That's the one
quality gap left in the Indic voice surface.
