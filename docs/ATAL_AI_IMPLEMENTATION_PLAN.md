# ATAL AI Complete Implementation Plan

**Project:** ATAL AI - ICSSR Research Prototype
**Date:** December 28, 2025
**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Google Gemini
**AI Frameworks:** Vercel AI SDK + Direct pgvector (NO LangChain)
**Timeline:** 16 weeks (UAT starting Week 10)
**Budget:** ₹172/year per student (97% under budget)

---

## CURRENT IMPLEMENTATION STATUS

### ✅ Database State (Live from Supabase - Dec 28, 2025)

| Table | Rows | Status |
|-------|------|--------|
| `curriculum_content` | **562** | ✅ Fully indexed with embeddings |
| `practice_questions` | **127** | ✅ Seeded and ready |
| `badges` | **10** | ✅ Cultural badges seeded |
| `irt_item_bank` | **180** | ✅ IRT questions ready |
| `schools` | **393** | ✅ Kamrup Rural schools |

### Curriculum Chunks by Language & Module

| Language | M1 | M2 | M3 | M4 | M5 | General | Total |
|----------|----|----|----|----|----|---------|----|
| English | 6 | 7 | 5 | 9 | 9 | 159 | **195** |
| Hindi | 6 | 7 | 5 | 9 | 10 | 184 | **221** |
| Assamese | 4 | 5 | 5 | 1 | 5 | 125 | **145** |

**All 562 chunks have vector embeddings** - RAG is fully operational!

### Phase Completion Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Database & Infrastructure | ✅ **COMPLETE** | All migrations applied, pgvector enabled |
| Phase 2: AI Service Layer | ✅ **COMPLETE** | Gemini provider, RAG, Socratic prompts |
| Phase 3: Voice AI | 🔄 **In Progress** | VoiceChat component exists, TTS route ready |
| Phase 4: Adaptive Learning | ✅ **COMPLETE** | Knowledge tracking, learning styles |
| Phase 5: Offline Sync | ✅ **COMPLETE** | IndexedDB, Background Sync, Lesson Cache |

---

## IMPLEMENTATION RULES & BEST PRACTICES

### CRITICAL: Always Follow These Rules

1. **Follow `rules.md` Compliance**
   - Always check and follow the project's `rules.md` file before making any changes
   - Maintain consistency with existing code patterns and conventions
   - Follow the established folder structure and naming conventions

2. **Use MCPs for Research & Documentation**
   - **Brave Search MCP**: Use for finding latest best practices, error solutions, and implementation patterns
   - **Context7 MCP**: Use for up-to-date documentation of libraries (Vercel AI SDK, Supabase, Next.js, etc.)
   - **Supabase MCP**: Use for database operations, migrations, and checking advisors

3. **Best Practices Checklist**
   - Always search for existing patterns in the codebase before implementing new features
   - Use TypeScript strict mode with proper type definitions
   - Follow RLS (Row Level Security) patterns from existing migrations
   - Write SECURITY DEFINER functions with explicit search_path
   - Use existing UI components from `@/components/ui/`
   - Follow the established API route patterns

4. **Before Each Implementation Step**
   ```
   1. Check rules.md for project-specific rules
   2. Use Context7 MCP to get latest library documentation
   3. Use Brave Search for best practices and known issues
   4. Check existing codebase patterns
   5. Implement following established conventions
   ```

---

## EXECUTIVE SUMMARY

This plan implements the complete ATAL AI platform with:
1. **AI Tutoring System** - Socratic method with trilingual support (EN/HI/AS)
2. **Voice AI** - Web Speech API (input) + AI4Bharat Indic-TTS (output) - FREE, Assamese supported
3. **Adaptive Learning** - Knowledge tracing with learning style detection
4. **Teacher Dashboard** - Real-time visibility into all student progress
5. **Gamification** - Cultural badges (Muga Silk, Bihu, Brahmaputra)
6. **Offline Sync** - Repository pattern with IndexedDB

### Framework Selection Rationale (REVISED based on research)

| Framework | Purpose | Why Selected |
|-----------|---------|--------------|
| **Vercel AI SDK** | Streaming UI, useChat hook | Best React integration, streaming built-in |
| **Gemini 2.5 Flash** | Text generation, chat | 25x cheaper than OpenAI, fast |
| **Web Speech API** | Voice input (STT) | FREE, browser-native, supports 'as-IN' for Assamese |
| **AI4Bharat TTS** | Voice output (TTS) | FREE, open-source, Assamese emotion support |
| **Supabase pgvector** | RAG for curriculum | Direct queries, NO LangChain (40% faster) |
| **Groq (Llama 3.3)** | Fallback provider | Keep existing, FREE tier |

### What Changed from Original Plan

| Original | Problem | New Solution |
|----------|---------|--------------|
| Gemini Live API | Assamese NOT supported (only 24 languages), over budget ₹2.66/conversation | Web Speech API + AI4Bharat TTS (both FREE) |
| LangChain.js | 40% overhead, 37KB bundle, unnecessary complexity | Direct pgvector queries with Supabase |
| 10-week timeline | Unrealistic for proper testing | 16 weeks with UAT at Week 10 |

### Cost Analysis

| Component | Monthly Cost (100 students) |
|-----------|----------------------------|
| Gemini 2.5 Flash | ₹1,000 (2M tokens) |
| AI4Bharat TTS | FREE (HuggingFace/self-hosted) |
| Web Speech API | FREE (browser-native) |
| Supabase | ₹400 (Pro tier) |
| Vercel | FREE (hobby) |
| **Total** | ₹1,435/month = ₹172/year per student |

---

## PHASE 1: DATABASE & INFRASTRUCTURE (Week 1-3)

### MCP Usage for Phase 1
```
- Use Supabase MCP: list_tables, list_migrations, apply_migration, get_advisors
- Use Context7 MCP: Get latest Supabase pgvector documentation
- Use Brave Search: "supabase pgvector best practices 2025"
```

### 1.1 Database Migrations

**File:** `apps/db/migrations/042_adaptive_learning_schema.sql`

```sql
-- Student Knowledge State (per topic)
CREATE TABLE student_knowledge_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_score DECIMAL(5,2) DEFAULT 0,
  confidence_level TEXT DEFAULT 'low',
  attempts INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  status TEXT DEFAULT 'not_started',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, module_id, topic_id)
);

-- Learning Style Profile
CREATE TABLE learning_style_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  visual_score DECIMAL(5,2) DEFAULT 33.33,
  text_score DECIMAL(5,2) DEFAULT 33.33,
  auditory_score DECIMAL(5,2) DEFAULT 33.33,
  preferred_style TEXT GENERATED ALWAYS AS (
    CASE
      WHEN visual_score >= text_score AND visual_score >= auditory_score THEN 'visual'
      WHEN auditory_score >= text_score AND auditory_score >= visual_score THEN 'auditory'
      ELSE 'text'
    END
  ) STORED,
  images_viewed INTEGER DEFAULT 0,
  voice_replays INTEGER DEFAULT 0,
  text_read_time_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Tutor Interactions (for teacher visibility)
CREATE TABLE ai_tutor_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  topic_id TEXT,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,
  input_mode TEXT DEFAULT 'text' CHECK (input_mode IN ('text', 'voice')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'as')),
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Formative Assessment Responses
CREATE TABLE formative_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  is_correct BOOLEAN,
  response_time_ms INTEGER,
  ai_hint_requested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Summative Assessment Results
CREATE TABLE summative_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  practical_score INTEGER DEFAULT 0,
  mcq_score INTEGER DEFAULT 0,
  reflection_score INTEGER DEFAULT 0,
  total_score INTEGER GENERATED ALWAYS AS (practical_score + mcq_score + reflection_score) STORED,
  passed BOOLEAN GENERATED ALWAYS AS (
    practical_score >= 42 AND mcq_score >= 18 AND reflection_score >= 11 AND
    (practical_score + mcq_score + reflection_score) >= 70
  ) STORED,
  badge_level TEXT GENERATED ALWAYS AS (
    CASE
      WHEN (practical_score + mcq_score + reflection_score) >= 95 THEN 'distinction'
      WHEN (practical_score + mcq_score + reflection_score) >= 85 THEN 'merit'
      WHEN (practical_score + mcq_score + reflection_score) >= 70 THEN 'pass'
      ELSE 'incomplete'
    END
  ) STORED,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Gamification: Badges
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_hi TEXT NOT NULL,
  name_as TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlock_criteria JSONB NOT NULL,
  cultural_note TEXT,
  rarity TEXT DEFAULT 'common'
);

-- Student Badges (earned)
CREATE TABLE student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, badge_id)
);

-- Points History
CREATE TABLE points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Curriculum Content (for RAG)
CREATE TABLE curriculum_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'hi', 'as')),
  content_type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vector similarity search index
CREATE INDEX ON curriculum_content USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS Policies
ALTER TABLE student_knowledge_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_style_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_interactions ENABLE ROW LEVEL SECURITY;

-- Students can read/write their own data
CREATE POLICY "students_own_knowledge" ON student_knowledge_state
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "students_own_learning_style" ON learning_style_profile
  FOR ALL USING (student_id = auth.uid());

-- Teachers can view their enrolled students
CREATE POLICY "teachers_view_student_progress" ON student_knowledge_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes c ON e.class_id = c.id
      WHERE e.student_id = student_knowledge_state.student_id
      AND c.teacher_id = auth.uid()
    )
  );
```

### 1.2 Enable pgvector Extension

**File:** `apps/db/migrations/043_enable_pgvector.sql`

```sql
-- Enable pgvector for curriculum embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

### 1.3 Match Curriculum Function

**File:** `apps/db/migrations/045_create_match_curriculum_function.sql`

```sql
-- pgvector similarity search function (NO LangChain needed)
CREATE OR REPLACE FUNCTION match_curriculum(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_language text DEFAULT NULL,
  filter_topic text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  module_id text,
  topic_id text,
  language text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.content,
    cc.module_id,
    cc.topic_id,
    cc.language,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM curriculum_content cc
  WHERE
    (filter_language IS NULL OR cc.language = filter_language)
    AND (filter_topic IS NULL OR cc.topic_id = filter_topic)
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## PHASE 2: AI SERVICE LAYER (Week 1-3)

### MCP Usage for Phase 2
```
- Use Context7 MCP: resolve-library-id "vercel ai sdk", then get-library-docs
- Use Context7 MCP: resolve-library-id "@ai-sdk/google", then get-library-docs
- Use Brave Search: "vercel ai sdk streaming best practices 2025"
```

### 2.1 Unified AI Service Architecture

```
apps/web/src/lib/ai/
├── providers/
│   ├── gemini.ts           # Google Gemini provider (primary)
│   ├── groq.ts             # Groq fallback (existing)
│   └── index.ts            # Provider factory
├── services/
│   ├── tutor-service.ts    # Socratic tutoring logic
│   ├── tts-service.ts      # AI4Bharat TTS (HuggingFace + Render)
│   ├── rag-service.ts      # Direct pgvector RAG
│   └── adaptive-service.ts # Learning style + knowledge tracking
├── prompts/
│   ├── socratic-tutor.ts   # Socratic method prompts
│   ├── assamese-persona.ts # Cultural context prompts
│   └── feedback.ts         # Assessment feedback prompts
└── config.ts               # AI configuration
```

### 2.2 Google Gemini Provider with Vercel AI SDK

**File:** `apps/web/src/lib/ai/providers/gemini.ts`

```typescript
import { google } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';

// Primary: Gemini 2.5 Flash via Vercel AI SDK
export const geminiModel = google('gemini-2.5-flash');

// Fallback: Groq with Llama 3.3 (keep existing)
export const groqModel = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})('llama-3.3-70b-versatile');

// Model selection with fallback
export async function getAIModel(preferredProvider: 'gemini' | 'groq' = 'gemini') {
  if (preferredProvider === 'groq' || !process.env.GEMINI_API_KEY) {
    return groqModel;
  }
  return geminiModel;
}
```

### 2.3 AI4Bharat TTS Service (Assamese Voice Output)

**File:** `apps/web/src/lib/ai/services/tts-service.ts`

```typescript
// TTS Service with HuggingFace primary + Render.com fallback
const HUGGINGFACE_API = 'https://api-inference.huggingface.co/models/ai4bharat/indic-parler-tts';
const RENDER_FALLBACK_API = process.env.TTS_FALLBACK_URL; // Self-hosted on Render.com

interface VoiceConfig {
  voice: string;
  emotion: string;
}

export class TTSService {
  async synthesize(text: string, language: 'en' | 'hi' | 'as'): Promise<ArrayBuffer> {
    const voiceConfig = this.getVoiceConfig(language);

    try {
      // Primary: HuggingFace Inference API
      return await this.callHuggingFace(text, voiceConfig);
    } catch (error) {
      console.warn('HuggingFace TTS failed, trying fallback:', error);
      // Fallback: Self-hosted on Render.com
      return await this.callRenderFallback(text, voiceConfig);
    }
  }

  private async callHuggingFace(text: string, config: VoiceConfig): Promise<ArrayBuffer> {
    const response = await fetch(HUGGINGFACE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          voice: config.voice,
          emotion: config.emotion || 'neutral'
        }
      })
    });

    if (!response.ok) throw new Error(`HuggingFace TTS error: ${response.status}`);
    return response.arrayBuffer();
  }

  private async callRenderFallback(text: string, config: VoiceConfig): Promise<ArrayBuffer> {
    if (!RENDER_FALLBACK_API) throw new Error('No TTS fallback configured');

    const response = await fetch(RENDER_FALLBACK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...config })
    });

    if (!response.ok) throw new Error(`Render TTS error: ${response.status}`);
    return response.arrayBuffer();
  }

  private getVoiceConfig(language: 'en' | 'hi' | 'as'): VoiceConfig {
    const configs = {
      en: { voice: 'en-IN-female', emotion: 'friendly' },
      hi: { voice: 'hi-IN-female', emotion: 'friendly' },
      as: { voice: 'as-IN-female', emotion: 'friendly' } // Assamese!
    };
    return configs[language];
  }
}
```

### 2.4 RAG Service with Direct pgvector (NO LangChain - 40% faster)

**File:** `apps/web/src/lib/ai/services/rag-service.ts`

```typescript
import { createClient } from '@/lib/supabase-server';

// Direct pgvector queries - NO LangChain overhead
export class CurriculumRAGService {

  async getRelevantContext(query: string, topicId: string, language: string): Promise<string> {
    const supabase = await createClient();

    // Get embedding for query using Google API directly
    const embedding = await this.getEmbedding(query);

    // Direct pgvector similarity search via Supabase RPC
    const { data: docs, error } = await supabase.rpc('match_curriculum', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
      filter_language: language,
      filter_topic: topicId || null
    });

    if (error) {
      console.error('RAG search error:', error);
      return '';
    }

    return docs?.map((d: { content: string }) => d.content).join('\n\n') || '';
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // Use Google Embeddings API directly (text-embedding-004)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] }
        })
      }
    );

    const data = await response.json();
    return data.embedding.values;
  }
}
```

### 2.5 Tutor Service with Socratic Method

**File:** `apps/web/src/lib/ai/services/tutor-service.ts`

```typescript
import { streamText } from 'ai';
import { geminiModel } from '../providers/gemini';
import { CurriculumRAGService } from './rag-service';
import { SOCRATIC_PROMPTS } from '../prompts/socratic-tutor';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class TutorService {
  private ragService: CurriculumRAGService;

  constructor() {
    this.ragService = new CurriculumRAGService();
  }

  async chat(params: {
    message: string;
    sessionId: string;
    studentId: string;
    topicId: string;
    language: 'en' | 'hi' | 'as';
    conversationHistory: Message[];
  }) {
    // Get curriculum context via RAG
    const context = await this.ragService.getRelevantContext(
      params.message,
      params.topicId,
      params.language
    );

    // Get student's learning style
    const learningStyle = await this.getLearningStyle(params.studentId);

    // Build Socratic prompt
    const systemPrompt = SOCRATIC_PROMPTS[params.language]
      .replace('{context}', context)
      .replace('{learning_style}', learningStyle);

    // Stream response using Vercel AI SDK
    const result = await streamText({
      model: geminiModel,
      system: systemPrompt,
      messages: [
        ...params.conversationHistory,
        { role: 'user', content: params.message }
      ],
      temperature: 0.7,
      maxTokens: 1024,
    });

    return result.toDataStreamResponse();
  }

  private async getLearningStyle(studentId: string): Promise<string> {
    // TODO: Implement learning style detection
    return 'balanced';
  }
}
```

---

## PHASE 3: VOICE AI IMPLEMENTATION (Week 8-11)

### MCP Usage for Phase 3
```
- Use Brave Search: "Web Speech API Assamese support 2025"
- Use Brave Search: "AI4Bharat Indic Parler TTS API usage"
- Use Context7 MCP: Get React audio handling best practices
```

> **REVISED**: Using Web Speech API (FREE, browser-native) + AI4Bharat TTS (FREE, Assamese support)
> instead of Gemini Live API (Assamese NOT supported, over budget)

### 3.1 Voice Chat Component with Web Speech API + AI4Bharat TTS

**File:** `apps/web/src/components/ai/VoiceChat.tsx`

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, VolumeX } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

// Language codes for Web Speech API
const SPEECH_LANG_CODES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  as: 'as-IN'  // Assamese supported!
};

interface VoiceChatProps {
  language: 'en' | 'hi' | 'as';
  topicId: string | null;
  onTranscript: (text: string, role: 'user' | 'assistant') => void;
}

export function VoiceChat({
  language,
  topicId,
  onTranscript
}: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use same chat API as text mode
  const { append, isLoading } = useChat({
    api: '/api/tutor/chat',
    body: { language, topicId, inputMode: 'voice' },
    onFinish: async (message) => {
      // Speak AI response using AI4Bharat TTS
      await speakResponse(message.content);
    }
  });

  // Start listening with Web Speech API
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = SPEECH_LANG_CODES[language];
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      if (event.results[0].isFinal) {
        onTranscript(transcript, 'user');
        append({ role: 'user', content: transcript });
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [language, append, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Speak response using AI4Bharat TTS
  const speakResponse = async (text: string) => {
    setIsSpeaking(true);

    try {
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language })
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    setIsSpeaking(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Mic Button */}
      <Button
        size="lg"
        className={`w-24 h-24 rounded-full transition-all ${
          isListening ? 'bg-red-500 animate-pulse scale-110' : 'bg-primary'
        }`}
        onClick={isListening ? stopListening : startListening}
        disabled={isLoading || isSpeaking}
      >
        {isListening ? (
          <MicOff className="w-10 h-10" />
        ) : (
          <Mic className="w-10 h-10" />
        )}
      </Button>

      {/* Speaking indicator */}
      {isSpeaking && (
        <Button variant="outline" size="sm" onClick={stopSpeaking}>
          <VolumeX className="w-4 h-4 mr-2" /> Stop Speaking
        </Button>
      )}

      {/* Status */}
      <p className="text-sm text-muted-foreground">
        {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Tap to speak'}
      </p>
    </div>
  );
}
```

### 3.2 TTS API Route (AI4Bharat with Fallback)

**File:** `apps/web/src/app/api/voice/tts/route.ts`

```typescript
import { TTSService } from '@/lib/ai/services/tts-service';

const ttsService = new TTSService();

export async function POST(request: Request) {
  const { text, language } = await request.json();

  if (!text || !language) {
    return new Response('Missing text or language', { status: 400 });
  }

  try {
    // Uses HuggingFace primary, Render.com fallback
    const audioBuffer = await ttsService.synthesize(text, language as 'en' | 'hi' | 'as');

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response('TTS generation failed', { status: 500 });
  }
}
```

---

## PHASE 4: ADAPTIVE LEARNING SYSTEM (Week 4-7)

### MCP Usage for Phase 4
```
- Use Brave Search: "adaptive learning knowledge tracing algorithms 2025"
- Use Context7 MCP: Supabase real-time subscriptions documentation
```

### 4.1 Learning Style Detection Service

**File:** `apps/web/src/lib/ai/services/adaptive-service.ts`

```typescript
import { createClient } from '@/lib/supabase-server';

interface BehaviorSignal {
  type: 'image_viewed' | 'voice_replay' | 'text_read';
  duration?: number;
}

interface TopicPerformance {
  score: number;
  timeSpent: number;
  hintsUsed: number;
}

export class AdaptiveLearningService {
  // Track behavior signals to detect learning style
  async trackBehavior(studentId: string, signal: BehaviorSignal) {
    const supabase = await createClient();

    // Update learning style profile based on behavior
    switch (signal.type) {
      case 'image_viewed':
        await supabase.rpc('increment_visual_score', {
          p_student_id: studentId,
          p_time_seconds: signal.duration
        });
        break;

      case 'voice_replay':
        await supabase.rpc('increment_auditory_score', {
          p_student_id: studentId
        });
        break;

      case 'text_read':
        await supabase.rpc('increment_text_score', {
          p_student_id: studentId,
          p_time_seconds: signal.duration
        });
        break;
    }
  }

  // Get personalized content based on learning style
  async getAdaptedContent(studentId: string, topicId: string) {
    const profile = await this.getLearningStyleProfile(studentId);

    return {
      showImages: profile.visual_score >= 40,
      enableVoice: profile.auditory_score >= 40,
      textComplexity: profile.text_score >= 50 ? 'detailed' : 'simple',
      preferredStyle: profile.preferred_style
    };
  }

  // Update knowledge state after assessment
  async updateKnowledgeState(
    studentId: string,
    topicId: string,
    performance: TopicPerformance
  ) {
    const supabase = await createClient();

    // Calculate new mastery using spaced repetition algorithm
    const currentState = await this.getKnowledgeState(studentId, topicId);
    const newMastery = this.calculateMastery(currentState, performance);

    await supabase
      .from('student_knowledge_state')
      .upsert({
        student_id: studentId,
        topic_id: topicId,
        mastery_score: newMastery,
        confidence_level: this.getConfidenceLevel(newMastery),
        attempts: (currentState?.attempts || 0) + 1,
        last_attempt_at: new Date().toISOString()
      });
  }

  // Get next recommended topic based on knowledge gaps
  async getNextTopic(studentId: string, moduleId: string): Promise<string | null> {
    const supabase = await createClient();

    // Find topics with lowest mastery that are prerequisites complete
    const { data: weakTopics } = await supabase
      .from('student_knowledge_state')
      .select('topic_id, mastery_score')
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .lt('mastery_score', 70)
      .order('mastery_score', { ascending: true })
      .limit(1);

    return weakTopics?.[0]?.topic_id || null;
  }

  private async getLearningStyleProfile(studentId: string) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('learning_style_profile')
      .select('*')
      .eq('student_id', studentId)
      .single();

    return data || { visual_score: 33.33, text_score: 33.33, auditory_score: 33.33, preferred_style: 'balanced' };
  }

  private async getKnowledgeState(studentId: string, topicId: string) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('student_knowledge_state')
      .select('*')
      .eq('student_id', studentId)
      .eq('topic_id', topicId)
      .single();

    return data;
  }

  private calculateMastery(currentState: any, performance: TopicPerformance): number {
    const baseScore = performance.score;
    const bonus = performance.hintsUsed === 0 ? 10 : 0;
    const previousMastery = currentState?.mastery_score || 0;

    // Weighted average with new performance
    return Math.min(100, (previousMastery * 0.3) + (baseScore + bonus) * 0.7);
  }

  private getConfidenceLevel(mastery: number): string {
    if (mastery >= 80) return 'high';
    if (mastery >= 50) return 'medium';
    return 'low';
  }
}
```

---

## IMPLEMENTATION TIMELINE (16 Weeks)

### Phase 1: Foundation (Weeks 1-3)
| Week | Deliverables |
|------|--------------|
| 1 | Database migrations (adaptive learning, gamification, pgvector) |
| 2 | Gemini provider + Groq fallback, RAG with direct pgvector |
| 3 | Socratic prompts, Curriculum indexing script |

### Phase 2: Core Features (Weeks 4-7)
| Week | Deliverables |
|------|--------------|
| 4 | Knowledge tracking system, Learning style detection |
| 5 | AI Tutor chat with useChat hook, Streaming UI |
| 6 | Teacher Dashboard with real-time subscriptions |
| 7 | Assessment integration, Formative/Summative tracking |

### Phase 3: Voice & Gamification (Weeks 8-11)
| Week | Deliverables |
|------|--------------|
| 8 | Web Speech API integration (STT) |
| 9 | AI4Bharat TTS (HuggingFace + Render fallback) |
| 10 | **UAT STARTS** in Sualkuchi schools (parallel with dev) |
| 11 | Cultural badges, Points system, Leaderboard |

### Phase 4: Offline & Polish (Weeks 12-16)
| Week | Deliverables |
|------|--------------|
| 12 | Offline sync with IndexedDB/Dexie |
| 13 | Learning path UI, Lesson pages |
| 14 | E2E tests, Performance optimization |
| 15 | Bug fixes from UAT feedback |
| 16 | Final UAT, Documentation, Deployment |

---

## DEPENDENCIES TO INSTALL

```bash
# Vercel AI SDK (streaming, useChat)
npm install ai @ai-sdk/google @ai-sdk/react @ai-sdk/groq

# Offline storage
npm install dexie

# NO LangChain needed - using direct pgvector queries
```

---

## ENVIRONMENT VARIABLES

```env
# Google AI (Primary)
GEMINI_API_KEY=your_gemini_api_key

# Groq (Fallback)
GROQ_API_KEY=your_groq_api_key

# TTS (AI4Bharat)
HUGGINGFACE_API_KEY=your_huggingface_api_key
TTS_FALLBACK_URL=https://your-app.onrender.com/tts

# Existing Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## CRITICAL FILES TO MODIFY/CREATE

### Database Migrations (Phase 1)
- `apps/db/migrations/042_adaptive_learning_schema.sql` - Knowledge state, learning styles, AI interactions
- `apps/db/migrations/043_enable_pgvector.sql` - Vector extension for RAG
- `apps/db/migrations/044_seed_cultural_badges.sql` - 5 cultural badges (Muga Silk, Gamosa, Bihu, Brahmaputra, Perfect)
- `apps/db/migrations/045_create_match_curriculum_function.sql` - pgvector similarity search

### AI Service Layer (Phase 1-2)
- `apps/web/src/lib/ai/providers/gemini.ts` - Gemini + Groq fallback
- `apps/web/src/lib/ai/services/tutor-service.ts` - Socratic tutoring logic
- `apps/web/src/lib/ai/services/rag-service.ts` - Direct pgvector (NO LangChain)
- `apps/web/src/lib/ai/services/tts-service.ts` - AI4Bharat TTS (HuggingFace + Render)
- `apps/web/src/lib/ai/services/adaptive-service.ts` - Learning style + knowledge tracking
- `apps/web/src/lib/ai/prompts/socratic-tutor.ts` - Trilingual Socratic prompts

### API Routes (Phase 2-3)
- `apps/web/src/app/api/tutor/chat/route.ts` - Streaming chat with RAG
- `apps/web/src/app/api/voice/tts/route.ts` - AI4Bharat TTS endpoint

### UI Components (Phase 3-4)
- `apps/web/src/app/app/ai-tutor/page.tsx` - Chat interface with useChat
- `apps/web/src/components/ai/VoiceChat.tsx` - Web Speech API + TTS
- `apps/web/src/components/ai/ChatMessage.tsx` - Message rendering
- `apps/web/src/app/app/learn/page.tsx` - Learning path
- `apps/web/src/app/app/learn/[moduleId]/[topicId]/page.tsx` - Lesson page

### Teacher Dashboard (Phase 2)
- `apps/web/src/components/teacher/StudentProgressGrid.tsx` - Real-time progress
- `apps/web/src/components/teacher/AIInteractionsLog.tsx` - AI usage visibility

### Offline (Phase 4) - ✅ COMPLETE

**Core Infrastructure:**
- `apps/web/src/lib/offline/database.ts` - Dexie IndexedDB with 4 tables
- `apps/web/src/lib/offline/sync-queue.ts` - Exponential backoff sync with jitter

**Network Detection:**
- `apps/web/src/hooks/useNetworkStatus.ts` - Network status hook with debounced reconnection

**Background Sync:**
- `apps/web/src/lib/offline/background-sync.ts` - Service Worker Background Sync API integration
- `apps/web/src/lib/offline/lesson-cache.ts` - Lesson pre-caching for offline access

**UI Components:**
- `apps/web/src/components/offline/SyncStatusIndicator.tsx` - Visual sync status with pending count
- `apps/web/src/components/offline/OfflineBanner.tsx` - Animated offline notification banner
- `apps/web/src/components/offline/index.ts` - Component exports

### Files to Modify
- `apps/web/package.json` - Add ai, @ai-sdk/google, dexie (NO LangChain)
- `apps/web/src/lib/constants/ai-config.ts` - Gemini config

---

## SUCCESS CRITERIA

1. **AI Tutoring**: Socratic questioning in EN/HI/AS with <5s response time (P95)
2. **Voice AI**: Web Speech API input + AI4Bharat TTS output, >80% accuracy for Assamese
3. **Adaptive Learning**: Personalized content based on detected learning style
4. **Teacher Dashboard**: Real-time visibility of ALL enrolled students' progress
5. **Gamification**: 5 cultural badges with auto-award triggers
6. **Offline**: Assessment submission works offline with sync on reconnect
7. **Cost**: ₹172/year per student (97% under original budget)
8. **UAT**: Week 10 in Sualkuchi schools with real students

---

## RESEARCH VALIDATION

All features backed by 2025 research:
- **Socratic AI**: Taiwan study (230 students) - 5x engagement vs direct answers
- **Voice (Assamese)**: AI4Bharat - 56% Indians prefer regional content
- **Offline-first**: DRC COVID response - critical for rural education
- **Gamification**: Meta-analysis (41 studies) - 0.82 effect size, 40% engagement increase

---

## MCP TOOLS REFERENCE

### For Each Implementation Step, Use:

1. **Context7 MCP** - Library Documentation
   ```
   resolve-library-id: "library-name"
   get-library-docs: context7CompatibleLibraryID, topic
   ```

2. **Brave Search MCP** - Best Practices & Solutions
   ```
   Search: "topic best practices 2025"
   Search: "error message solution"
   ```

3. **Supabase MCP** - Database Operations
   ```
   list_tables, list_migrations, apply_migration
   execute_sql, get_advisors (security/performance)
   ```

---

## OFFLINE SYNC IMPLEMENTATION (Best Practices 2025)

### Sources
- [Microsoft PWA Background Syncs](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs)
- [MDN Offline and Background Operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [LogRocket Offline-first 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Dexie.js Cloud Documentation](https://dexie.org/docs/cloud/)

### Implemented Patterns

#### 1. Network Status Detection
```typescript
// apps/web/src/hooks/useNetworkStatus.ts
export function useNetworkStatus(): NetworkStatus {
  // - Debounced reconnection (2s delay to prevent flapping)
  // - NetworkInformation API support
  // - Connection quality detection (2G, 3G, 4G, WiFi)
  // - Save-data mode detection
}
```

#### 2. Sync Queue with Subscription Pattern
```typescript
// apps/web/src/lib/offline/sync-queue.ts
class SyncQueue {
  // Subscription pattern for UI updates
  subscribe(callback: SyncStatusCallback): () => void;

  // Manual sync with progress
  async manualSync(onProgress?: ProgressCallback): Promise<SyncResult>;

  // Exponential backoff with 10% jitter
  private getBackoffDelay(retries: number): number {
    const baseDelay = Math.min(BASE_DELAY * Math.pow(2, retries), MAX_DELAY);
    const jitter = baseDelay * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(baseDelay + jitter);
  }
}
```

#### 3. Background Sync API
```typescript
// apps/web/src/lib/offline/background-sync.ts
export const SYNC_TAGS = {
  ASSESSMENT: 'sync-assessments',  // Highest priority
  PROGRESS: 'sync-progress',       // Medium priority
  CHAT: 'sync-chat',               // Can be batched
  POINTS: 'sync-points',           // Low priority
  ALL: 'sync-all',
} as const;

// Registration functions
export async function registerSync(tag: SyncTag): Promise<boolean>;
export async function registerPeriodicSync(tag: PeriodicSyncTag, minInterval: number): Promise<boolean>;
```

#### 4. Lesson Cache with Fallback
```typescript
// apps/web/src/lib/offline/lesson-cache.ts
// Primary: Cache API
// Fallback: IndexedDB (for Safari compatibility)
export async function preCacheLessons(moduleId: string, language: Language): Promise<{cached: number; failed: number}>;
export async function getCachedLesson(moduleId: string, topicId: string, language: Language): Promise<CachedLesson['content'] | null>;
export async function isLessonCached(moduleId: string, topicId: string, language?: Language): Promise<boolean>;
```

#### 5. UI Components
```typescript
// apps/web/src/components/offline/SyncStatusIndicator.tsx
// - Shows pending count badge
// - Manual sync button when online
// - Tooltip with last sync time

// apps/web/src/components/offline/OfflineBanner.tsx
// - Animated banner when offline
// - Shows pending mutations count
// - Connection quality indicator
```

### Key Implementation Decisions
1. **Two-store pattern**: Data store + sync queue (separate concerns)
2. **Priority-based sync**: Assessments sync first, points last
3. **Jitter for backoff**: 10% variance to prevent thundering herd
4. **Cache API primary**: Better for large lesson content, IndexedDB fallback
5. **7-day cache expiry**: Balance freshness vs storage
6. **Debounced reconnection**: 2s delay prevents UI flapping

---

*Last Updated: December 28, 2025*
*Plan Version: 2.1 (Updated with offline sync implementation)*
