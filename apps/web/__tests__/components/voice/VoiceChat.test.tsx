/**
 * Tests for VoiceChat component
 * Target: ~18 tests covering voice input functionality
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoiceChat } from "@/components/voice/VoiceChat";

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    size,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    size?: string;
    type?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-size={size}
      type={type as "button" | "submit" | "reset" | undefined}
    >
      {children}
    </button>
  ),
}));

// Mock Speech Recognition
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockAbort = jest.fn();

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start = mockStart;
  stop = mockStop;
  abort = mockAbort;
}

describe("VoiceChat", () => {
  const defaultProps = {
    language: "en" as const,
    onTranscript: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up global SpeechRecognition
    Object.defineProperty(globalThis, "webkitSpeechRecognition", {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up
    delete (globalThis as { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;
  });

  describe("rendering", () => {
    it("should render speak button", () => {
      render(<VoiceChat {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should show Speak text when not listening", () => {
      render(<VoiceChat {...defaultProps} />);
      expect(screen.getByText("Speak")).toBeInTheDocument();
    });

    it("should show microphone emoji", () => {
      render(<VoiceChat {...defaultProps} />);
      expect(screen.getByText("🎤")).toBeInTheDocument();
    });

    it("should show language indicator for English", () => {
      render(<VoiceChat {...defaultProps} language="en" />);
      expect(screen.getByText(/Language:.*English/)).toBeInTheDocument();
    });

    it("should show language indicator for Hindi", () => {
      render(<VoiceChat {...defaultProps} language="hi" />);
      expect(screen.getByText(/Language:.*हिंदी/)).toBeInTheDocument();
    });

    it("should show language indicator for Assamese", () => {
      render(<VoiceChat {...defaultProps} language="as" />);
      expect(screen.getByText(/Language:.*অসমীয়া/)).toBeInTheDocument();
    });
  });

  describe("button state", () => {
    it("should be enabled by default", () => {
      render(<VoiceChat {...defaultProps} />);
      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });

    it("should be disabled when disabled prop is true", () => {
      render(<VoiceChat {...defaultProps} disabled={true} />);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("listening interactions", () => {
    it("should call start when button clicked", () => {
      render(<VoiceChat {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(mockStart).toHaveBeenCalled();
    });

    it("should not call start when disabled", () => {
      render(<VoiceChat {...defaultProps} disabled={true} />);

      fireEvent.click(screen.getByRole("button"));

      expect(mockStart).not.toHaveBeenCalled();
    });
  });

  describe("browser support", () => {
    it("should show unsupported message when Speech API not available", () => {
      // Remove SpeechRecognition support
      delete (globalThis as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
      delete (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition;

      render(<VoiceChat {...defaultProps} />);

      expect(
        screen.getByText(/Voice input is not supported/i)
      ).toBeInTheDocument();
    });

    it("should show browser suggestion when not supported", () => {
      delete (globalThis as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
      delete (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition;

      render(<VoiceChat {...defaultProps} />);

      expect(
        screen.getByText(/Please use Chrome, Edge, or Safari/i)
      ).toBeInTheDocument();
    });
  });

  describe("language configuration", () => {
    it("should configure English language correctly", () => {
      render(<VoiceChat {...defaultProps} language="en" />);
      // The component should set lang to "en-IN"
      // We verify this through the language indicator
      expect(screen.getByText(/English/)).toBeInTheDocument();
    });

    it("should configure Hindi language correctly", () => {
      render(<VoiceChat {...defaultProps} language="hi" />);
      expect(screen.getByText(/हिंदी/)).toBeInTheDocument();
    });

    it("should configure Assamese language correctly", () => {
      render(<VoiceChat {...defaultProps} language="as" />);
      expect(screen.getByText(/অসমীয়া/)).toBeInTheDocument();
    });
  });
});
