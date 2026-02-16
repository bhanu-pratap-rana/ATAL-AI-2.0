/**
 * Tests for SyncStatusIndicator.tsx
 * Target: ~20 tests covering sync status display and behavior
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { SyncStatusIndicator, useSyncStatus } from "@/components/offline/SyncStatusIndicator";
import { renderHook } from "@testing-library/react";

// Mock useNetworkStatus hook
const mockNetworkStatus = { isOnline: true };
jest.mock("@/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => mockNetworkStatus,
}));

// Mock sync queue
const mockSubscribe = jest.fn();
const mockManualSync = jest.fn();

jest.mock("@/lib/offline/sync-queue", () => ({
  syncQueue: {
    subscribe: (callback: (status: unknown) => void) => {
      mockSubscribe(callback);
      // Call immediately with default status
      callback({
        pendingCount: 0,
        failedCount: 0,
        isSyncing: false,
        lastSyncAt: null,
        lastError: null,
      });
      return jest.fn(); // Return unsubscribe function
    },
    manualSync: () => mockManualSync(),
  },
}));

// Mock cn utility
jest.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  WifiOff: () => <span data-testid="icon-wifi-off">WifiOff</span>,
  RefreshCw: ({ className }: { className?: string }) => (
    <span data-testid="icon-refresh" className={className}>RefreshCw</span>
  ),
  AlertCircle: () => <span data-testid="icon-alert">AlertCircle</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
}));

describe("SyncStatusIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkStatus.isOnline = true;
    mockManualSync.mockResolvedValue(undefined);
  });

  describe("rendering", () => {
    it("should render the component", () => {
      render(<SyncStatusIndicator />);

      expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
    });

    it("should render in compact mode", () => {
      render(<SyncStatusIndicator compact />);

      expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<SyncStatusIndicator className="custom-class" />);

      // Check that custom class is applied
      const button = container.querySelector(".custom-class");
      expect(button).toBeInTheDocument();
    });
  });

  describe("online status display", () => {
    it("should show check icon when online and all synced", () => {
      render(<SyncStatusIndicator />);

      expect(screen.getByTestId("icon-check")).toBeInTheDocument();
    });

    it("should show appropriate tooltip when all synced", () => {
      render(<SyncStatusIndicator />);

      expect(screen.getByText("All synced")).toBeInTheDocument();
    });
  });

  describe("offline status display", () => {
    it("should show wifi-off icon when offline", () => {
      mockNetworkStatus.isOnline = false;
      render(<SyncStatusIndicator />);

      expect(screen.getByTestId("icon-wifi-off")).toBeInTheDocument();
    });

    it("should show offline message in tooltip", () => {
      mockNetworkStatus.isOnline = false;
      render(<SyncStatusIndicator />);

      expect(screen.getByText("Offline - changes will sync when you reconnect")).toBeInTheDocument();
    });
  });

  describe("badge display", () => {
    it("should show badge when showBadge is true and has pending items", () => {
      // Mock sync queue to have pending items
      jest.spyOn(require("@/lib/offline/sync-queue").syncQueue, "subscribe")
        .mockImplementation((callback: (status: unknown) => void) => {
          callback({
            pendingCount: 5,
            failedCount: 0,
            isSyncing: false,
            lastSyncAt: null,
            lastError: null,
          });
          return jest.fn();
        });

      render(<SyncStatusIndicator showBadge />);

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should show 9+ when pending count exceeds 9", () => {
      jest.spyOn(require("@/lib/offline/sync-queue").syncQueue, "subscribe")
        .mockImplementation((callback: (status: unknown) => void) => {
          callback({
            pendingCount: 15,
            failedCount: 0,
            isSyncing: false,
            lastSyncAt: null,
            lastError: null,
          });
          return jest.fn();
        });

      render(<SyncStatusIndicator showBadge />);

      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  describe("helper functions", () => {
    it("should format relative time for just now", () => {
      // formatRelativeTime is internal, tested through component behavior
      jest.spyOn(require("@/lib/offline/sync-queue").syncQueue, "subscribe")
        .mockImplementation((callback: (status: unknown) => void) => {
          callback({
            pendingCount: 0,
            failedCount: 0,
            isSyncing: false,
            lastSyncAt: Date.now() - 30000, // 30 seconds ago
            lastError: null,
          });
          return jest.fn();
        });

      render(<SyncStatusIndicator />);

      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });

    it("should format relative time for minutes", () => {
      jest.spyOn(require("@/lib/offline/sync-queue").syncQueue, "subscribe")
        .mockImplementation((callback: (status: unknown) => void) => {
          callback({
            pendingCount: 0,
            failedCount: 0,
            isSyncing: false,
            lastSyncAt: Date.now() - 300000, // 5 minutes ago
            lastError: null,
          });
          return jest.fn();
        });

      render(<SyncStatusIndicator />);

      expect(screen.getByText(/5 min ago/)).toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("should render compact indicator without button", () => {
      const { container } = render(<SyncStatusIndicator compact />);

      // In compact mode, no button element
      expect(container.querySelector("button")).not.toBeInTheDocument();
    });
  });
});

describe("useSyncStatus hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkStatus.isOnline = true;
  });

  it("should return sync status", () => {
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.isOnline).toBe(true);
  });

  it("should calculate canSync correctly", () => {
    // When online with no pending items
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.canSync).toBe(false);
  });

  it("should provide sync function", () => {
    const { result } = renderHook(() => useSyncStatus());

    expect(typeof result.current.sync).toBe("function");
  });
});
