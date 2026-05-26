# Atal AI — Complete Free-First Fallback Matrix

**Date:** 2026-05-15
**Branch:** `fix/admin-portal-bugs-2026-05-12` @ `9df2c4b`
**Goal:** For every AI surface in the app, define a runtime auto-failover chain that keeps the platform functional even when the primary (paid) provider is down, rate-limited, or out of quota. Prioritize **free** options that maintain trilingual EN/HI/AS support.

---

## Status at a glance

| Surface | Primary | Fallback layer 1 | Fallback layer 2 | Auto-switch? |
|---------|---------|------------------|------------------|--------------|
| **Chat / Streaming (tutor)** | Gemini 2.5 Flash | HuggingFace PRO | **Groq (FREE)** | ✅ **NEW in PR-51 (commit 9df2c4b)** |
| **Lesson generation** | Gemini 2.5 Flash | HuggingFace PRO | **Groq (FREE)** | ✅ NEW in PR-51 |
| **Embeddings (RAG)** | Google `text-embedding-004` | _none_ | _none_ | ⚠️ Recommend adding Sentence-Transformers self-hosted |
| **TTS (voice output)** | Google Cloud Neural2 | Browser `speechSynthesis` | _none_ | ✅ Has try/catch; ⚠️ no native Assamese — recommend Bhashini layer |
| **STT (voice input)** | Web Speech API (browser) | _none — graceful "unsupported" message_ | _none_ | ❌ No server fallback; recommend Bhashini → Whisper |
| **Image generation (Imagen)** | Vertex AI Imagen 3 | Supabase base64 fallback | _none_ | ❌ No free model fallback — recommend FLUX.1-schnell / Pollinations |

---

## 1. Chat / Streaming text models — ✅ FAILOVER SHIPPED in PR-51

### What ships today

`generateTextWithFallback` and `streamTextWithFallback` (in `apps/web/src/lib/ai/with-fallback.ts`) wrap the Vercel AI SDK calls with a retry loop across `Gemini → HuggingFace → Groq`. When one provider rejects (auth, rate-limit, 5xx), the wrapper logs the failure and tries the next.

The lesson and tutor routes are wired into this wrapper. Behaviour change:

- **Before:** Gemini 5xx → user sees an error
- **After:** Gemini 5xx → wrapper retries on Groq (FREE tier, already configured) → student gets a response with one extra log line

### Available providers and free limits (chat)

| Provider | Free tier | Best for | Notes |
|----------|-----------|----------|-------|
| **Gemini 2.5 Flash** | $0 with API key, 15 RPM, 1M tokens/day free | Highest quality, 1M context window | Primary |
| **Groq (llama-3.3-70b-versatile)** | 14,400 RPM free, 30 RPS | Fastest (300-500 tokens/sec) | Best fallback — practically zero latency |
| **HuggingFace Inference (Mistral / Llama)** | Free up to ~30k requests/mo with rate cap | Backup | Slower; use as tertiary |
| **Cerebras** | 30 RPM free, llama 3.3 70b | Even faster than Groq for some workloads | Alternative to Groq |
| **OpenAI** | $5 credits trial | High quality | No free tier after trial |
| **Anthropic Claude** | $5 credits trial | High quality | Same |
| **Together.ai** | $1 credits trial | Open-weight models | Same |
| **Ollama / self-hosted** | Free forever | Total control | Needs GPU host or Mac for usable speed |

### Recommended runtime chain
```
Gemini 2.5 Flash  (high quality, paid + free tier)
  ↓ on 4xx/5xx/timeout
Groq llama-3.3-70b  (FREE, very fast, 14,400 RPM)
  ↓ on failure
HuggingFace Mistral-7B / Llama-3.1-8b  (FREE, slower)
  ↓ on failure
Error to user
```

### Env vars (already in `.env.local`)
- `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` — ✅
- `GROQ_API_KEY` — ✅
- `HUGGINGFACE_API_KEY` — optional, ⚠️ not currently set

---

## 2. Embeddings (RAG vector search) — ⚠️ NO FALLBACK

### Current state
RAG service uses Google's `text-embedding-004` model via `models/text-embedding-004:embedContent`. There's no fallback — if Google returns an error, RAG search throws and the tutor can't get curriculum context.

### Free alternatives (drop-in)

| Provider | Dimensions | Free tier | Quality |
|----------|-----------|-----------|---------|
| **Google `text-embedding-004`** | 768 | 1,500 RPM free | Current |
| **Voyage AI `voyage-3-lite`** | 512 | 50M tokens/mo free | Slightly better |
| **Cohere `embed-multilingual-light-v3.0`** | 384 | Trial credits | Optimized for multilingual incl HI |
| **Sentence-Transformers `paraphrase-multilingual-MiniLM-L12-v2`** | 384 | **FREE forever, self-hosted** | Decent quality, very fast |
| **BGE-M3** (BAAI) | 1024 | **FREE forever, self-hosted** | Best open-source multilingual |
| **AI4Bharat IndicBERT v2** | 768 | **FREE, native HI+AS embeddings** | Strongest for Indic |

### Recommended action
Add a similar `getEmbeddingWithFallback()` wrapper. Chain:
1. Google `text-embedding-004` (current primary)
2. Voyage AI `voyage-3-lite` (free 50M tokens/mo)
3. Self-hosted BGE-M3 or AI4Bharat IndicBERT v2

**Caveat:** changing embedding model = re-embedding the entire curriculum corpus (different vector space). Cannot hot-swap mid-RAG without re-indexing. So this is a config-time fallback only, not a per-request one. The right pattern is: each query first tries Google, on persistent failure logs an alert + queue a re-index job to switch the system to a different embedding model.

For MVP: ship a graceful degradation — when embeddings fail, RAG falls back to plain text-keyword search against `curriculum_content` (already implemented in the topic-id direct path). The tutor still answers, just without semantic retrieval.

---

## 3. TTS (voice output)

### Current state (✅ has fallback)

```
Google Cloud Neural2 (en-IN / hi-IN / bn-IN-as-fallback)
  ↓ on error
Browser speechSynthesis (free, low quality, varies by OS)
```

### Free alternatives

| Provider | Free tier | Languages | Quality |
|----------|-----------|-----------|---------|
| **Google Cloud TTS Neural2** | 1M chars/mo Neural2, 4M Standard | EN+HI native, AS via bn-IN | Current primary |
| **Bhashini (Govt of India ULCA)** | FREE unlimited for non-commercial / educational | **Native Hindi + native Assamese** | Government-grade |
| **AI4Bharat Indic-TTS** | Open-source, self-host | Native Hindi + Assamese | Strong for Indic |
| **Coqui XTTS v2** | Open-source, self-host | 17 languages incl HI | Voice cloning support, slower |
| **Piper (rhasspy)** | Open-source, runs on Raspberry Pi | EN excellent, HI limited, no AS | Lowest infra cost |
| **Browser speechSynthesis** | Free | Whatever the OS has | Lowest quality but always available |
| **ElevenLabs** | 10k chars/mo free | Multilingual incl Hindi | Best quality + voice cloning, paid |
| **Azure Speech Neural** | 500k chars/mo free F0 tier | **Native HI + native AS (Ramkrishna M / Prabhat F)** | Best human-like for AS |

### Recommended runtime chain (with native Assamese)
```
TTS request for `as`:
  Bhashini (FREE, native AS)
    ↓ on error
  Azure Speech as-IN (500k/mo free, native AS)
    ↓ on error
  Google Cloud bn-IN-Neural2-A (current — Bengali fallback)
    ↓ on error
  Browser speechSynthesis (last resort)

TTS request for `hi`:
  Google Cloud hi-IN-Neural2-A (native HI, current primary)
    ↓ on error
  Bhashini hi (FREE backup)
    ↓ on error
  Browser speechSynthesis

TTS request for `en`:
  Google Cloud en-IN-Neural2-A
    ↓ on error
  Browser speechSynthesis
```

### Recommended action
Filed as PR-53 (formerly PR-52): add Bhashini as an env-gated provider in `src/lib/ai/services/google-cloud-tts.ts`. Default routing keeps Google as primary except for `as` where Bhashini becomes primary. Effort: 2-3h.

---

## 4. STT (voice input) — ❌ NO SERVER FALLBACK

### Current state
`VoiceChat.tsx` uses `window.SpeechRecognition` / `webkitSpeechRecognition` only. Firefox, older Safari, and in-app browsers (WhatsApp, Instagram) see a "Voice input is not supported" message.

### Free alternatives

| Provider | Free tier | Languages | Quality |
|----------|-----------|-----------|---------|
| **Web Speech API** (current) | Free, browser-native | Browser-dependent | Chrome best |
| **Bhashini ASR** | FREE unlimited for educational | **Native HI + native AS** | Government-trained |
| **OpenAI Whisper API (`whisper-1`)** | ~$0.006/min (~₹0.50/min) | Multilingual incl HI; weaker AS | Excellent |
| **Whisper self-hosted (tiny/base/small/medium/large-v3)** | FREE forever | Same as Whisper API | tiny=ok, large-v3=excellent |
| **Faster-Whisper** (CTranslate2 port) | FREE | Same | 4x faster than vanilla on CPU |
| **AI4Bharat IndicConformer** | FREE, self-host | Native HI + AS | Strong for Indic |
| **Google Cloud Speech-to-Text** | $300 trial only | HI ✓, AS experimental | High quality, paid after trial |
| **Azure Speech-to-Text** | F0 free tier 5 hrs/mo | Native HI + native AS | Top quality, paid after free |

### Recommended runtime chain
```
Web Speech API (client-side, free, only on Chromium/Safari)
  ↓ if unsupported (Firefox, in-app browsers)
POST audio to /api/voice/stt:
  Bhashini ASR (FREE, native HI+AS)
    ↓ on error
  Whisper API (~₹0.50/min, paid)
    ↓ on error
  Error: voice unavailable, please type
```

### Recommended action
Filed as PR-52: add `POST /api/voice/stt` route, modify VoiceChat.tsx to use `MediaRecorder` and POST when Web Speech API is unavailable. Effort: 3-4h.

---

## 5. Image generation (Imagen)

### Current state
`generateImage()` calls Vertex AI Imagen 3. On failure: base64 inline fallback (no actual image, just the prompt). No model fallback.

### Free alternatives

| Provider | Free tier | Quality | Notes |
|----------|-----------|---------|-------|
| **Vertex AI Imagen 3** | $300 trial credits | Best for educational diagrams | Current primary |
| **FLUX.1-schnell via HuggingFace** | FREE rate-limited via Inference API | Top-tier, fast | Best free option |
| **FLUX.1-schnell via Together.ai** | $1 credits trial | Same | Faster server |
| **Stable Diffusion XL** | Free via HuggingFace Spaces | Good general purpose | Slow |
| **Pollinations.ai** | **FREE, no API key needed** | Decent quality | `https://image.pollinations.ai/prompt/<encoded>` direct URL |
| **Replicate** | Trial credits | All models | Pay per second |
| **Midjourney / DALL-E** | Paid only | Top quality | No free tier |
| **Local Stable Diffusion** | FREE forever | Varies | Needs GPU |
| **AI4Bharat Chitralekha** | Not yet GA | Indic-context images | Future option |

### Recommended runtime chain
```
Vertex AI Imagen 3 (primary, $300 trial / paid)
  ↓ on error
FLUX.1-schnell via HuggingFace Inference (FREE, rate-limited)
  ↓ on error
Pollinations.ai direct URL (FREE, no auth required)
  ↓ on error
Skip image, show emoji or icon placeholder
```

### Recommended action
Filed as PR-54: add `generateImageWithFallback` in `src/lib/ai/services/imagen-service.ts`. Effort: 2-3h. Implementation tip: Pollinations is just a URL hit (`https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512`) — no API key, no SDK, just fetch.

---

## 6. Why "free-first" matters for this deployment

Atal AI is the Assam Digital Initiative's PWA for rural Kamrup schools. The state government pays per-classroom subscriptions; runaway API costs come straight out of the deployment budget. Each fallback layer that's free directly extends the runway. Specifically:

| Provider | Cost model | Annual cost at 10k MAU |
|----------|-----------|-------------------------|
| **Groq** chat fallback (free 14,400 RPM) | $0 forever | $0 |
| **Bhashini** TTS+STT (free for education) | $0 forever | $0 |
| **HuggingFace** Inference free tier | $0 with rate limits | $0 |
| **Pollinations** image | $0 forever, no auth | $0 |
| **Self-hosted Whisper** STT | One-time GPU cost ~$2k | ~$0 marginal |
| **Self-hosted FLUX.1-schnell** image | One-time GPU cost ~$2k | ~$0 marginal |

Even if every paid provider hit a billing wall on day 1, the platform would keep functioning on the free fallback layer alone — Groq for chat, Bhashini for voice (both directions), Pollinations for images, Google text-embedding free tier (1,500 RPM) for RAG.

---

## Filed follow-ups (free-first fallback completion)

| # | Severity | Title | Effort |
|---|----------|-------|--------|
| **PR-51** | DONE | Runtime auto-failover wrapper for chat models | shipped 9df2c4b |
| PR-52 | MEDIUM | `/api/voice/stt` server route (Bhashini → Whisper) for Firefox/Safari/in-app browsers | 3-4h |
| PR-53 | MEDIUM | Add Bhashini TTS as primary Assamese provider | 2-3h |
| PR-54 | MEDIUM | Image generation fallback (Imagen → FLUX.1-schnell → Pollinations) | 2-3h |
| PR-55 | LOW | Embeddings graceful degradation (RAG falls back to keyword search on vector failure) | 1-2h |
| PR-56 | LOW | Per-student voice preference (M/F) and Bhashini opt-in flag | 1h |

---

## Commit landed this round

| Commit | What |
|--------|------|
| `9df2c4b` | PR-51 — Runtime chat-model failover wrapper (Gemini → HuggingFace → Groq) wired into tutor + lesson routes |

---

## Bottom line

**Before today:** Chat / lesson generation depended on Gemini being healthy. Any Gemini 5xx or rate-limit cascaded to user errors. Groq was configured as a free fallback but only activated when Gemini's key was *missing entirely* — not when Gemini *failed at runtime*.

**Now:** Tutor chat and lesson generation auto-retry on Groq (free) when Gemini fails. Recovery is logged so we can monitor how often each provider drops out in production.

**Next free-first wins (in priority order):**
1. PR-52 — STT server route → 3-4h, unlocks Firefox/Safari/in-app voice users
2. PR-53 — Bhashini Assamese TTS → 2-3h, gives native pronunciation (currently Bengali fallback)
3. PR-54 — Image fallback chain → 2-3h, removes Vertex AI as a single point of failure

Each one keeps the deployment running on $0 if the paid providers go dark.
