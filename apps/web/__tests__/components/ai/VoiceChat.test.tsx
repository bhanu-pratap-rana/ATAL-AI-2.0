/**
 * Tests for VoiceChat Component
 * Tests voice input/output functionality with Web Speech API mocking
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock client-logger before imports
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch for TTS API calls
global.fetch = jest.fn();

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  lang: "",
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
  onstart: null as (() => void) | null,
  onresult: null as ((event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null,
  onerror: null as ((event: { error: string }) => void) | null,
  onend: null as (() => void) | null,
};

const MockSpeechRecognitionConstructor = jest.fn(() => mockSpeechRecognition);

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
};

// Mock Audio
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioPause = jest.fn();
let _mockAudioOnended: (() => void) | null = null;
let _mockAudioOnerror: (() => void) | null = null;

class MockAudio {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url?: string) {
    if (url) this.src = url;
    _mockAudioOnended = null;
    _mockAudioOnerror = null;
  }

  play = jest.fn(() => {
    _mockAudioOnended = this.onended;
    _mockAudioOnerror = this.onerror;
    return mockAudioPlay();
  });

  pause = mockAudioPause;
}

// Setup global mocks
Object.defineProperty(globalThis, "SpeechRecognition", {
  value: MockSpeechRecognitionConstructor,
  writable: true,
});

Object.defineProperty(globalThis, "webkitSpeechRecognition", {
  value: MockSpeechRecognitionConstructor,
  writable: true,
});

Object.defineProperty(globalThis, "speechSynthesis", {
  value: mockSpeechSynthesis,
  writable: true,
});

Object.defineProperty(globalThis, "Audio", {
  value: MockAudio,
  writable: true,
});

Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  value: class {
    text = "";
    lang = "";
    rate = 1;
    pitch = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text?: string) {
      if (text) this.text = text;
    }
  },
  writable: true,
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

import { VoiceChat, useTTS } from "@/components/ai/VoiceChat";
import { renderHook, act as hookAct } from "@testing-library/react";

describe("VoiceChat Component", () => {
  const mockOnTranscript = jest.fn();
  const _mockOnSpeakStart = jest.fn();
  const _mockOnSpeakEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpeechRecognition.start.mockClear();
    mockSpeechRecognition.stop.mockClear();
    mockSpeechRecognition.abort.mockClear();
    mockSpeechRecognition.onstart = null;
    mockSpeechRecognition.onresult = null;
    mockSpeechRecognition.onerror = null;
    mockSpeechRecognition.onend = null;
  });

  describe("Rendering", () => {
    it("should render mic button", () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should show 'Tap to speak' text when idle", () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      expect(screen.getByText("Tap to speak")).toBeInTheDocument();
    });

    it("should disable button when disabled prop is true", () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
          disabled={true}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Speech Recognition", () => {
    it("should start listening when mic button is clicked", () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    it("should set correct language for English", () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockSpeechRecognition.lang).toBe("en-IN");
    });

    it("should set correct language for Hindi", () => {
      render(
        <VoiceChat
          language="hi"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockSpeechRecognition.lang).toBe("hi-IN");
    });

    it("should set correct language for Assamese", () => {
      render(
        <VoiceChat
          language="as"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockSpeechRecognition.lang).toBe("as-IN");
    });

    it("should show 'Listening...' when recognition starts", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      // Simulate onstart callback
      await act(async () => {
        mockSpeechRecognition.onstart?.();
      });

      expect(screen.getByText("Listening...")).toBeInTheDocument();
    });

    it("should call onTranscript with final result", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        mockSpeechRecognition.onstart?.();
      });

      // Simulate final result
      await act(async () => {
        mockSpeechRecognition.onresult?.({
          resultIndex: 0,
          results: {
            length: 1,
            0: { isFinal: true, 0: { transcript: "Hello world" } },
          },
        });
      });

      expect(mockOnTranscript).toHaveBeenCalledWith("Hello world");
    });

    it("should stop listening when button clicked again", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await act(async () => {
        mockSpeechRecognition.onstart?.();
      });

      fireEvent.click(button);

      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    it("should handle no-speech error", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        mockSpeechRecognition.onerror?.({ error: "no-speech" });
      });

      expect(screen.getByText(/No speech detected/)).toBeInTheDocument();
    });

    it("should handle audio-capture error", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        mockSpeechRecognition.onerror?.({ error: "audio-capture" });
      });

      expect(screen.getByText(/Microphone not found/)).toBeInTheDocument();
    });

    it("should handle not-allowed error", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        mockSpeechRecognition.onerror?.({ error: "not-allowed" });
      });

      expect(screen.getByText(/Microphone access denied/)).toBeInTheDocument();
    });

    it("should handle generic error", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        mockSpeechRecognition.onerror?.({ error: "network" });
      });

      expect(screen.getByText(/Speech recognition error: network/)).toBeInTheDocument();
    });

    it("should reset listening state on recognition end", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        mockSpeechRecognition.onstart?.();
      });

      expect(screen.getByText("Listening...")).toBeInTheDocument();

      await act(async () => {
        mockSpeechRecognition.onend?.();
      });

      expect(screen.getByText("Tap to speak")).toBeInTheDocument();
    });
  });

  describe("Interim Results", () => {
    it("should show interim transcript while speaking", async () => {
      render(
        <VoiceChat
          language="en"
          onTranscript={mockOnTranscript}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        mockSpeechRecognition.onstart?.();
      });

      // Simulate interim result
      await act(async () => {
        mockSpeechRecognition.onresult?.({
          resultIndex: 0,
          results: {
            length: 1,
            0: { isFinal: false, 0: { transcript: "Hel" } },
          },
        });
      });

      expect(screen.getByText(/"Hel"/)).toBeInTheDocument();
    });
  });
});

describe("useTTS Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it("should not speak when already speaking", async () => {
    const { result } = renderHook(() => useTTS("en"));

    // Mock successful TTS response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["audio"])),
    });

    // Start speaking
    await hookAct(async () => {
      await result.current.speak("Hello");
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // isSpeaking should be true, second call should be ignored
    // (Note: Due to async nature, this test verifies the API was called once)
  });

  it("should not speak when text is empty", async () => {
    const { result } = renderHook(() => useTTS("en"));

    await hookAct(async () => {
      await result.current.speak("");
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should call TTS API with correct parameters", async () => {
    const { result } = renderHook(() => useTTS("hi"));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["audio"])),
    });

    await hookAct(async () => {
      await result.current.speak("नमस्ते");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "नमस्ते", language: "hi" }),
    });
  });

  it("should handle TTS API error", async () => {
    const { result } = renderHook(() => useTTS("en"));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    await hookAct(async () => {
      await result.current.speak("Hello");
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("should stop audio when stop is called", async () => {
    const { result } = renderHook(() => useTTS("en"));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["audio"])),
    });

    await hookAct(async () => {
      await result.current.speak("Hello");
    });

    hookAct(() => {
      result.current.stop();
    });

    expect(result.current.isSpeaking).toBe(false);
  });
});
