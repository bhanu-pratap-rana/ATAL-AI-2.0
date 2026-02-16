/**
 * Tests for ai-config constants
 * Target: ~25 tests covering AI configuration constants
 */

import {
  AI_DEFAULTS,
  AI_FEATURES,
  AI_PROVIDERS,
  TTS_CONFIG,
  STT_CONFIG,
  AI_LANGUAGES,
  type AIProviderKey,
  type AILanguageKey,
  type AIFeatureKey,
} from "@/lib/constants/ai-config";

describe("AI_DEFAULTS", () => {
  it("should have temperature of 0.7", () => {
    expect(AI_DEFAULTS.temperature).toBe(0.7);
  });

  it("should have maxTokens of 2048", () => {
    expect(AI_DEFAULTS.maxTokens).toBe(2048);
  });

  it("should have temperature in valid range (0-1)", () => {
    expect(AI_DEFAULTS.temperature).toBeGreaterThanOrEqual(0);
    expect(AI_DEFAULTS.temperature).toBeLessThanOrEqual(1);
  });

  it("should have positive maxTokens", () => {
    expect(AI_DEFAULTS.maxTokens).toBeGreaterThan(0);
  });
});

describe("AI_FEATURES", () => {
  describe("tutor", () => {
    it("should have temperature of 0.7 for conversational responses", () => {
      expect(AI_FEATURES.tutor.temperature).toBe(0.7);
    });

    it("should have maxTokens of 1024", () => {
      expect(AI_FEATURES.tutor.maxTokens).toBe(1024);
    });
  });

  describe("essayFeedback", () => {
    it("should have lower temperature of 0.3 for consistency", () => {
      expect(AI_FEATURES.essayFeedback.temperature).toBe(0.3);
    });

    it("should have maxTokens of 1024", () => {
      expect(AI_FEATURES.essayFeedback.maxTokens).toBe(1024);
    });

    it("should be less creative than tutor", () => {
      expect(AI_FEATURES.essayFeedback.temperature).toBeLessThan(
        AI_FEATURES.tutor.temperature
      );
    });
  });

  describe("practiceQuestions", () => {
    it("should have balanced temperature of 0.5", () => {
      expect(AI_FEATURES.practiceQuestions.temperature).toBe(0.5);
    });

    it("should have larger maxTokens of 2048", () => {
      expect(AI_FEATURES.practiceQuestions.maxTokens).toBe(2048);
    });
  });

  describe("summarization", () => {
    it("should have low temperature of 0.3 for analytical output", () => {
      expect(AI_FEATURES.summarization.temperature).toBe(0.3);
    });

    it("should have maxTokens of 1024", () => {
      expect(AI_FEATURES.summarization.maxTokens).toBe(1024);
    });
  });

  describe("all features", () => {
    it("should have valid temperature range for all features", () => {
      Object.values(AI_FEATURES).forEach((feature) => {
        expect(feature.temperature).toBeGreaterThanOrEqual(0);
        expect(feature.temperature).toBeLessThanOrEqual(1);
      });
    });

    it("should have positive maxTokens for all features", () => {
      Object.values(AI_FEATURES).forEach((feature) => {
        expect(feature.maxTokens).toBeGreaterThan(0);
      });
    });
  });
});

describe("AI_PROVIDERS", () => {
  describe("gemini", () => {
    it("should have name 'Google Gemini'", () => {
      expect(AI_PROVIDERS.gemini.name).toBe("Google Gemini");
    });

    it("should have default model gemini-2.5-flash-preview-05-20", () => {
      expect(AI_PROVIDERS.gemini.defaultModel).toBe(
        "gemini-2.5-flash-preview-05-20"
      );
    });

    it("should have correct base URL", () => {
      expect(AI_PROVIDERS.gemini.baseUrl).toBe(
        "https://generativelanguage.googleapis.com/v1"
      );
    });

    it("should have embedding model text-embedding-004", () => {
      expect(AI_PROVIDERS.gemini.embeddingModel).toBe("text-embedding-004");
    });

    it("should have embedding dimensions of 768", () => {
      expect(AI_PROVIDERS.gemini.embeddingDimensions).toBe(768);
    });
  });

  describe("groq", () => {
    it("should have name 'Groq'", () => {
      expect(AI_PROVIDERS.groq.name).toBe("Groq");
    });

    it("should have default model llama-3.3-70b-versatile", () => {
      expect(AI_PROVIDERS.groq.defaultModel).toBe("llama-3.3-70b-versatile");
    });

    it("should have correct base URL", () => {
      expect(AI_PROVIDERS.groq.baseUrl).toBe("https://api.groq.com/openai/v1");
    });
  });

  describe("ollama", () => {
    it("should have name 'Ollama'", () => {
      expect(AI_PROVIDERS.ollama.name).toBe("Ollama");
    });

    it("should have default model cogito:14b", () => {
      expect(AI_PROVIDERS.ollama.defaultModel).toBe("cogito:14b");
    });

    it("should have localhost base URL", () => {
      expect(AI_PROVIDERS.ollama.baseUrl).toBe("http://localhost:11434");
    });
  });

  describe("openai", () => {
    it("should have name 'OpenAI'", () => {
      expect(AI_PROVIDERS.openai.name).toBe("OpenAI");
    });

    it("should have default model gpt-4o-mini", () => {
      expect(AI_PROVIDERS.openai.defaultModel).toBe("gpt-4o-mini");
    });

    it("should have correct base URL", () => {
      expect(AI_PROVIDERS.openai.baseUrl).toBe("https://api.openai.com/v1");
    });
  });

  describe("all providers", () => {
    it("should have name for all providers", () => {
      Object.values(AI_PROVIDERS).forEach((provider) => {
        expect(provider.name).toBeTruthy();
      });
    });

    it("should have defaultModel for all providers", () => {
      Object.values(AI_PROVIDERS).forEach((provider) => {
        expect(provider.defaultModel).toBeTruthy();
      });
    });

    it("should have baseUrl for all providers", () => {
      Object.values(AI_PROVIDERS).forEach((provider) => {
        expect(provider.baseUrl).toBeTruthy();
      });
    });
  });
});

describe("TTS_CONFIG", () => {
  describe("ai4bharat", () => {
    it("should have name 'AI4Bharat Indic-Parler-TTS'", () => {
      expect(TTS_CONFIG.ai4bharat.name).toBe("AI4Bharat Indic-Parler-TTS");
    });

    it("should have Hugging Face URL", () => {
      expect(TTS_CONFIG.ai4bharat.huggingFaceUrl).toBe(
        "https://api-inference.huggingface.co/models/ai4bharat/indic-parler-tts"
      );
    });

    it("should support English, Hindi, and Assamese", () => {
      expect(TTS_CONFIG.ai4bharat.supportedLanguages).toContain("en");
      expect(TTS_CONFIG.ai4bharat.supportedLanguages).toContain("hi");
      expect(TTS_CONFIG.ai4bharat.supportedLanguages).toContain("as");
    });

    it("should have default voice as female", () => {
      expect(TTS_CONFIG.ai4bharat.defaultVoice).toBe("female");
    });

    it("should have default emotion as friendly", () => {
      expect(TTS_CONFIG.ai4bharat.defaultEmotion).toBe("friendly");
    });
  });
});

describe("STT_CONFIG", () => {
  describe("webSpeechApi", () => {
    it("should have name 'Web Speech API'", () => {
      expect(STT_CONFIG.webSpeechApi.name).toBe("Web Speech API");
    });

    it("should have English language code en-IN", () => {
      expect(STT_CONFIG.webSpeechApi.languageCodes.en).toBe("en-IN");
    });

    it("should have Hindi language code hi-IN", () => {
      expect(STT_CONFIG.webSpeechApi.languageCodes.hi).toBe("hi-IN");
    });

    it("should have Assamese language code as-IN", () => {
      expect(STT_CONFIG.webSpeechApi.languageCodes.as).toBe("as-IN");
    });
  });
});

describe("AI_LANGUAGES", () => {
  it("should have English language", () => {
    expect(AI_LANGUAGES.en).toBe("English");
  });

  it("should have Hindi language", () => {
    expect(AI_LANGUAGES.hi).toBe("Hindi");
  });

  it("should have Assamese language", () => {
    expect(AI_LANGUAGES.as).toBe("Assamese");
  });

  it("should have 3 supported languages", () => {
    expect(Object.keys(AI_LANGUAGES)).toHaveLength(3);
  });
});

describe("Type definitions", () => {
  it("should have valid AIProviderKey type", () => {
    const validKeys: AIProviderKey[] = ["gemini", "groq", "ollama", "openai"];
    validKeys.forEach((key) => {
      expect(AI_PROVIDERS[key]).toBeDefined();
    });
  });

  it("should have valid AILanguageKey type", () => {
    const validKeys: AILanguageKey[] = ["en", "hi", "as"];
    validKeys.forEach((key) => {
      expect(AI_LANGUAGES[key]).toBeDefined();
    });
  });

  it("should have valid AIFeatureKey type", () => {
    const validKeys: AIFeatureKey[] = [
      "tutor",
      "essayFeedback",
      "practiceQuestions",
      "summarization",
    ];
    validKeys.forEach((key) => {
      expect(AI_FEATURES[key]).toBeDefined();
    });
  });
});
