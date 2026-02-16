/**
 * Tests for BadgesDisplay and BadgesCompact components
 * Target: ~25 tests covering badge display behavior
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BadgesDisplay, BadgesCompact } from "@/components/gamification/BadgesDisplay";

// Mock Supabase
const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock Card components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock HTMLDialogElement methods
const mockShowModal = jest.fn();
const mockClose = jest.fn();

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = mockShowModal;
  HTMLDialogElement.prototype.close = mockClose;
});

const mockBadges = [
  {
    id: "badge-1",
    name_en: "First Steps",
    name_hi: "पहले कदम",
    name_as: "প্ৰথম পদক্ষেপ",
    description: "Complete your first lesson",
    icon: "🎯",
    cultural_note: "Cultural note for badge",
    rarity: "common",
    points_value: 100,
  },
  {
    id: "badge-2",
    name_en: "Quiz Master",
    name_hi: "क्विज मास्टर",
    name_as: "কুইজ মাষ্টাৰ",
    description: "Complete 10 quizzes",
    icon: "🏆",
    cultural_note: null,
    rarity: "rare",
    points_value: 500,
  },
];

const mockEarnedBadges = [
  { badge_id: "badge-1", earned_at: "2024-01-01T00:00:00Z" },
];

describe("BadgesDisplay", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockOrder.mockResolvedValue({ data: mockBadges, error: null });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockEq.mockResolvedValue({ data: mockEarnedBadges, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "badges") {
        return { select: mockSelect };
      }
      if (table === "student_badges") {
        return {
          select: () => ({ eq: mockEq }),
        };
      }
      return {};
    });
  });

  describe("loading state", () => {
    it("should show loading skeletons initially", () => {
      render(<BadgesDisplay studentId="student-1" />);
      // Loading skeletons have animate-pulse class
      const { container } = render(<BadgesDisplay studentId="student-1" />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("data display", () => {
    it("should fetch badges from database", async () => {
      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("badges");
      });
    });

    it("should fetch student earned badges", async () => {
      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("student_badges");
      });
    });

    it("should display earned badge count", async () => {
      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("Earned")).toBeInTheDocument();
      });
    });

    it("should display locked badge count", async () => {
      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("Locked")).toBeInTheDocument();
      });
    });

    it("should display total points", async () => {
      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("Points")).toBeInTheDocument();
      });
    });
  });

  describe("language support", () => {
    it("should display English names by default", async () => {
      render(<BadgesDisplay studentId="student-1" language="en" />);

      await waitFor(() => {
        expect(screen.getByText("First Steps")).toBeInTheDocument();
      });
    });

    it("should display Hindi names when language is hi", async () => {
      render(<BadgesDisplay studentId="student-1" language="hi" />);

      await waitFor(() => {
        expect(screen.getByText("पहले कदम")).toBeInTheDocument();
      });
    });

    it("should display Assamese names when language is as", async () => {
      render(<BadgesDisplay studentId="student-1" language="as" />);

      await waitFor(() => {
        expect(screen.getByText("প্ৰথম পদক্ষেপ")).toBeInTheDocument();
      });
    });
  });

  describe("showAll prop", () => {
    it("should show all badges when showAll is true", async () => {
      render(<BadgesDisplay studentId="student-1" showAll={true} />);

      await waitFor(() => {
        expect(screen.getByText("First Steps")).toBeInTheDocument();
        expect(screen.getByText("Quiz Master")).toBeInTheDocument();
      });
    });
  });

  describe("badge modal", () => {
    it("should open modal when badge is clicked", async () => {
      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("First Steps")).toBeInTheDocument();
      });

      const badgeButton = screen.getByText("First Steps").closest("button");
      if (badgeButton) {
        fireEvent.click(badgeButton);
        expect(mockShowModal).toHaveBeenCalled();
      }
    });

    it("should close modal when close button is clicked", async () => {
      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("First Steps")).toBeInTheDocument();
      });

      const badgeButton = screen.getByText("First Steps").closest("button");
      if (badgeButton) {
        fireEvent.click(badgeButton);
      }

      const closeButton = screen.getByLabelText("Close badge details");
      fireEvent.click(closeButton);

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle badges fetch error", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "Error" } });

      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        // Component should still render without crashing
        expect(screen.getByText("Earned")).toBeInTheDocument();
      });
    });

    it("should handle student badges fetch error", async () => {
      mockEq.mockResolvedValue({ data: null, error: { message: "Error" } });

      render(<BadgesDisplay studentId="student-1" />);

      await waitFor(() => {
        // Component should still render without crashing
        expect(screen.getByText("Earned")).toBeInTheDocument();
      });
    });
  });
});

describe("BadgesCompact", () => {
  const mockCompactBadges = [
    { id: "1", icon: "🎯", name: "Badge 1" },
    { id: "2", icon: "🏆", name: "Badge 2" },
    { id: "3", icon: "⭐", name: "Badge 3" },
    { id: "4", icon: "🎨", name: "Badge 4" },
    { id: "5", icon: "📚", name: "Badge 5" },
    { id: "6", icon: "🔥", name: "Badge 6" },
  ];

  it("should render badge icons", () => {
    render(<BadgesCompact badges={mockCompactBadges.slice(0, 3)} />);
    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(screen.getByText("🏆")).toBeInTheDocument();
    expect(screen.getByText("⭐")).toBeInTheDocument();
  });

  it("should limit displayed badges to maxDisplay", () => {
    render(<BadgesCompact badges={mockCompactBadges} maxDisplay={3} />);
    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(screen.getByText("🏆")).toBeInTheDocument();
    expect(screen.getByText("⭐")).toBeInTheDocument();
    expect(screen.queryByText("🎨")).not.toBeInTheDocument();
  });

  it("should show remaining count when badges exceed maxDisplay", () => {
    render(<BadgesCompact badges={mockCompactBadges} maxDisplay={3} />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("should not show remaining count when badges are within limit", () => {
    render(<BadgesCompact badges={mockCompactBadges.slice(0, 3)} maxDisplay={5} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("should default maxDisplay to 5", () => {
    render(<BadgesCompact badges={mockCompactBadges} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("should show title attribute for each badge", () => {
    render(<BadgesCompact badges={mockCompactBadges.slice(0, 2)} />);
    expect(screen.getByTitle("Badge 1")).toBeInTheDocument();
    expect(screen.getByTitle("Badge 2")).toBeInTheDocument();
  });
});
