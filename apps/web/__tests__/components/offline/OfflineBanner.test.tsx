/**
 * Tests for OfflineBanner, OfflineNotice, and ConnectionQuality components
 * Target: ~25 tests covering offline states and sync status
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  OfflineBanner,
  OfflineNotice,
  ConnectionQuality,
} from "@/components/offline/OfflineBanner";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  WifiOff: ({ className }: { className?: string }) => (
    <span data-testid="wifi-off-icon" className={className}>
      WifiOff
    </span>
  ),
  Cloud: ({ className }: { className?: string }) => (
    <span data-testid="cloud-icon" className={className}>
      Cloud
    </span>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <span data-testid="refresh-icon" className={className}>
      Refresh
    </span>
  ),
}));

// Mock network status hook
const mockNetworkStatus = {
  isOnline: true,
  isSlowConnection: false,
  effectiveType: "4g",
};
jest.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => mockNetworkStatus,
}));

// Mock sync queue
const mockSubscribe = jest.fn();
jest.mock("@/lib/offline/sync-queue", () => ({
  syncQueue: {
    subscribe: (callback: (status: unknown) => void) => {
      mockSubscribe(callback);
      // Initial call with default status
      callback({
        pendingCount: 0,
        failedCount: 0,
        isSyncing: false,
        lastSyncAt: null,
        lastError: null,
      });
      return jest.fn(); // unsubscribe
    },
  },
}));

// Mock cn utility
jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

describe("OfflineBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to online state
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.isSlowConnection = false;
  });

  describe("when online", () => {
    it("should not render when online with no pending sync", () => {
      const { container } = render(<OfflineBanner />);

      // After mount, should be null when online
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
    });
  });

  describe("when offline", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
    });

    it("should render when offline", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("should show WifiOff icon when offline", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        expect(screen.getByTestId("wifi-off-icon")).toBeInTheDocument();
      });
    });

    it("should show offline message", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
      });
    });

    it("should have warning background when offline", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.className).toContain("bg-warning");
      });
    });
  });

  describe("slow connection", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
      mockNetworkStatus.isSlowConnection = true;
    });

    it("should show slow connection message", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        expect(screen.getByText(/slow connection detected/i)).toBeInTheDocument();
      });
    });
  });

  describe("position prop", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
    });

    it("should be positioned at top by default", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.className).toContain("top-0");
      });
    });

    it("should be positioned at bottom when specified", async () => {
      render(<OfflineBanner position="bottom" />);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.className).toContain("bottom-0");
      });
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
    });

    it("should have role alert", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("should have aria-live polite", async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toHaveAttribute("aria-live", "polite");
      });
    });
  });

  describe("className prop", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
    });

    it("should apply additional className", async () => {
      render(<OfflineBanner className="custom-class" />);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.className).toContain("custom-class");
      });
    });
  });
});

describe("OfflineNotice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkStatus.isOnline = true;
  });

  describe("when online", () => {
    it("should not render when online", () => {
      const { container } = render(<OfflineNotice />);

      expect(container.querySelector("output")).not.toBeInTheDocument();
    });
  });

  describe("when offline", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
    });

    it("should render when offline", () => {
      render(<OfflineNotice />);

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });

    it("should show WifiOff icon", () => {
      render(<OfflineNotice />);

      expect(screen.getByTestId("wifi-off-icon")).toBeInTheDocument();
    });

    it("should use output element", () => {
      const { container } = render(<OfflineNotice />);

      expect(container.querySelector("output")).toBeInTheDocument();
    });

    it("should apply className", () => {
      const { container } = render(<OfflineNotice className="custom-class" />);

      const output = container.querySelector("output");
      expect(output?.className).toContain("custom-class");
    });
  });
});

describe("ConnectionQuality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkStatus.isOnline = true;
    mockNetworkStatus.isSlowConnection = false;
    mockNetworkStatus.effectiveType = "4g";
  });

  describe("when online with good connection", () => {
    it("should not render for good connections", () => {
      const { container } = render(<ConnectionQuality />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("when offline", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
    });

    it("should show offline indicator", () => {
      render(<ConnectionQuality />);

      expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("should show WifiOff icon", () => {
      render(<ConnectionQuality />);

      expect(screen.getByTestId("wifi-off-icon")).toBeInTheDocument();
    });

    it("should have error styling", () => {
      const { container } = render(<ConnectionQuality />);

      const indicator = container.firstChild;
      expect((indicator as Element)?.className).toContain("text-error");
    });
  });

  describe("when slow connection", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = true;
      mockNetworkStatus.isSlowConnection = true;
      mockNetworkStatus.effectiveType = "2g";
    });

    it("should show slow connection indicator", () => {
      render(<ConnectionQuality />);

      expect(screen.getByText(/slow/i)).toBeInTheDocument();
    });

    it("should show connection type", () => {
      render(<ConnectionQuality />);

      expect(screen.getByText(/2g/i)).toBeInTheDocument();
    });

    it("should show Cloud icon for slow connection", () => {
      render(<ConnectionQuality />);

      expect(screen.getByTestId("cloud-icon")).toBeInTheDocument();
    });

    it("should have warning styling", () => {
      const { container } = render(<ConnectionQuality />);

      const indicator = container.firstChild;
      expect((indicator as Element)?.className).toContain("text-warning");
    });
  });

  describe("className prop", () => {
    beforeEach(() => {
      mockNetworkStatus.isOnline = false;
    });

    it("should apply className", () => {
      const { container } = render(<ConnectionQuality className="custom-class" />);

      const indicator = container.firstChild;
      expect((indicator as Element)?.className).toContain("custom-class");
    });
  });
});
