/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LessonPreCacher, DownloadModuleButton } from "../LessonPreCacher";

// Mock the lesson-cache service
const mockPreCacheLessons = jest.fn();
jest.mock("@/lib/offline/lesson-cache", () => ({
  preCacheLessons: (...args: unknown[]) => mockPreCacheLessons(...args),
}));

// Mock useNetworkStatus hook
const mockUseNetworkStatus = jest.fn();
jest.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Download: () => <span data-testid="download-icon">Download</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
  Loader2: () => <span data-testid="loader-icon">Loader2</span>,
}));

describe("LessonPreCacher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseNetworkStatus.mockReturnValue({ isOnline: true });
    mockPreCacheLessons.mockResolvedValue({ cached: 5, failed: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("silent mode (showIndicator=false)", () => {
    it("renders nothing when showIndicator is false", () => {
      const { container } = render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2", "T1.3"]}
          showIndicator={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("still triggers caching in silent mode", async () => {
      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2", "T1.3"]}
          showIndicator={false}
        />
      );

      // Advance timers past the 2000ms delay
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      expect(mockPreCacheLessons).toHaveBeenCalledWith("M1", "en");
    });
  });

  describe("visible indicator mode", () => {
    it("renders indicator when showIndicator is true", () => {
      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2"]}
          showIndicator={true}
        />
      );

      expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
    });

    it("shows download icon initially", () => {
      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2"]}
          showIndicator={true}
        />
      );

      expect(screen.getByTestId("download-icon")).toBeInTheDocument();
    });

    it("shows loader icon while caching", async () => {
      mockPreCacheLessons.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2"]}
          showIndicator={true}
        />
      );

      // Advance timers past the delay
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });

    it("shows check icon when caching is done", async () => {
      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2"]}
          showIndicator={true}
        />
      );

      // Advance timers and wait for async caching
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      await waitFor(() => {
        expect(screen.getByTestId("check-icon")).toBeInTheDocument();
      });
    });
  });

  describe("network status handling", () => {
    it("does not cache when offline", async () => {
      mockUseNetworkStatus.mockReturnValue({ isOnline: false });

      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2"]}
          showIndicator={true}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      expect(mockPreCacheLessons).not.toHaveBeenCalled();
    });

    it("shows offline message in tooltip when offline", () => {
      mockUseNetworkStatus.mockReturnValue({ isOnline: false });

      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1", "T1.2"]}
          showIndicator={true}
        />
      );

      expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Go online to cache lessons");
    });
  });

  describe("language support", () => {
    it("uses default language en when not specified", async () => {
      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1"]}
          showIndicator={false}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      expect(mockPreCacheLessons).toHaveBeenCalledWith("M1", "en");
    });

    it("uses specified language", async () => {
      render(
        <LessonPreCacher
          moduleId="M1"
          language="hi"
          topicIds={["T1.1"]}
          showIndicator={false}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      expect(mockPreCacheLessons).toHaveBeenCalledWith("M1", "hi");
    });
  });

  describe("error handling", () => {
    it("handles caching errors gracefully", async () => {
      mockPreCacheLessons.mockRejectedValue(new Error("Network error"));

      render(
        <LessonPreCacher
          moduleId="M1"
          topicIds={["T1.1"]}
          showIndicator={true}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      await waitFor(() => {
        expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Failed to cache lessons");
      });
    });
  });
});

describe("DownloadModuleButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkStatus.mockReturnValue({ isOnline: true });
    mockPreCacheLessons.mockResolvedValue({ cached: 5, failed: 1 });
  });

  it("renders download button with module name", () => {
    render(
      <DownloadModuleButton
        moduleId="M1"
        moduleName="Computer Basics"
      />
    );

    expect(screen.getByRole("button")).toHaveTextContent("Download Computer Basics");
  });

  it("is disabled when offline", () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });

    render(
      <DownloadModuleButton
        moduleId="M1"
        moduleName="Computer Basics"
      />
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows downloading state when clicked", async () => {
    mockPreCacheLessons.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <DownloadModuleButton
        moduleId="M1"
        moduleName="Computer Basics"
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Downloading...");
    });
  });

  it("shows downloaded state with count after success", async () => {
    render(
      <DownloadModuleButton
        moduleId="M1"
        moduleName="Computer Basics"
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Downloaded (5 lessons)");
    });
  });

  it("shows retry download state after error", async () => {
    mockPreCacheLessons.mockRejectedValue(new Error("Download failed"));

    render(
      <DownloadModuleButton
        moduleId="M1"
        moduleName="Computer Basics"
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Retry Download");
    });
  });

  it("is disabled while downloading", async () => {
    mockPreCacheLessons.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <DownloadModuleButton
        moduleId="M1"
        moduleName="Computer Basics"
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  it("does not trigger download when already downloading", async () => {
    mockPreCacheLessons.mockImplementation(() => new Promise(() => {}));

    render(
      <DownloadModuleButton
        moduleId="M1"
        moduleName="Computer Basics"
      />
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button")); // Try clicking again

    expect(mockPreCacheLessons).toHaveBeenCalledTimes(1);
  });

  it("calls preCacheLessons with correct parameters", async () => {
    render(
      <DownloadModuleButton
        moduleId="M2"
        moduleName="Operating Systems"
        language="as"
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockPreCacheLessons).toHaveBeenCalledWith("M2", "as");
    });
  });
});
