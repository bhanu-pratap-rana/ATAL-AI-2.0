/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ClassAssessmentResultsPage from "../page";

// Mock next/navigation
const mockRedirect = jest.fn();
const mockNotFound = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    mockNotFound();
    throw new Error("NOT_FOUND");
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock supabase-server
const mockGetUser = jest.fn();
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

// Mock role-utils
jest.mock("@/lib/auth/role-utils", () => ({
  isTeacherOrHigher: (role: string | undefined) =>
    role === "teacher" || role === "admin" || role === "super_admin",
}));

// Mock teacher actions
const mockGetClassAssessmentResults = jest.fn();
jest.mock("@/app/actions/teacher", () => ({
  getClassAssessmentResults: (...args: unknown[]) => mockGetClassAssessmentResults(...args),
}));

// Mock UI components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 {...props}>{children}</h3>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

describe("ClassAssessmentResultsPage", () => {
  const mockClassResults = {
    className: "Test Class",
    totalStudents: 10,
    studentsWithAssessments: 8,
    classAverageScore: 75,
    results: [
      {
        studentId: "s1",
        studentName: "John Doe",
        rollNumber: "001",
        averageScore: 85,
        sessionsCompleted: 2,
        correctAnswers: 17,
        totalQuestions: 20,
        lastAssessmentDate: new Date().toISOString(),
      },
      {
        studentId: "s2",
        studentName: "Jane Smith",
        rollNumber: "002",
        averageScore: 65,
        sessionsCompleted: 1,
        correctAnswers: 13,
        totalQuestions: 20,
        lastAssessmentDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      },
      {
        studentId: "s3",
        studentName: "Bob Wilson",
        rollNumber: null,
        averageScore: null,
        sessionsCompleted: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        lastAssessmentDate: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", app_metadata: { role: "teacher" } } },
    });
    mockGetClassAssessmentResults.mockResolvedValue({
      success: true,
      data: mockClassResults,
    });
  });

  describe("authentication and authorization", () => {
    it("redirects to teacher/start when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(
        ClassAssessmentResultsPage({ params: Promise.resolve({ classId: "class-123" }) })
      ).rejects.toThrow("REDIRECT:/teacher/start");

      expect(mockRedirect).toHaveBeenCalledWith("/teacher/start");
    });

    it("redirects to dashboard when user is not teacher or admin", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", app_metadata: { role: "student" } } },
      });

      await expect(
        ClassAssessmentResultsPage({ params: Promise.resolve({ classId: "class-123" }) })
      ).rejects.toThrow("REDIRECT:/app/dashboard");

      expect(mockRedirect).toHaveBeenCalledWith("/app/dashboard");
    });
  });

  describe("data fetching", () => {
    it("calls getClassAssessmentResults with classId", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-456" }),
      });
      render(Component);

      expect(mockGetClassAssessmentResults).toHaveBeenCalledWith("class-456");
    });

    it("throws notFound when results fetch fails", async () => {
      mockGetClassAssessmentResults.mockResolvedValue({ success: false });

      await expect(
        ClassAssessmentResultsPage({ params: Promise.resolve({ classId: "class-123" }) })
      ).rejects.toThrow("NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });

    it("throws notFound when no data returned", async () => {
      mockGetClassAssessmentResults.mockResolvedValue({ success: true, data: null });

      await expect(
        ClassAssessmentResultsPage({ params: Promise.resolve({ classId: "class-123" }) })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("rendering", () => {
    it("renders class name as heading", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      expect(screen.getByText("Test Class")).toBeInTheDocument();
    });

    it("renders back link to assessments", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      expect(screen.getByText("← Back to Assessments")).toBeInTheDocument();
    });

    it("renders summary stats cards", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      expect(screen.getByText("Total Students")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      // "2" appears multiple times (sessions count in table too)
      const twos = screen.getAllByText("2");
      expect(twos.length).toBeGreaterThan(0);
      expect(screen.getByText("Class Average")).toBeInTheDocument();
      // 75% may appear multiple times
      const seventyFives = screen.getAllByText("75%");
      expect(seventyFives.length).toBeGreaterThan(0);
    });

    it("shows dash for class average when null", async () => {
      mockGetClassAssessmentResults.mockResolvedValue({
        success: true,
        data: { ...mockClassResults, classAverageScore: null },
      });

      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      // Dash appears multiple times (in stats and in student scores)
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe("student results table", () => {
    it("renders student results heading with count", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      expect(screen.getByText("📊")).toBeInTheDocument();
      expect(screen.getByText("Student Results")).toBeInTheDocument();
      expect(screen.getByText("(3 students)")).toBeInTheDocument();
    });

    it("renders student names", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      // Names appear in both mobile and desktop views
      const johns = screen.getAllByText("John Doe");
      const janes = screen.getAllByText("Jane Smith");
      const bobs = screen.getAllByText("Bob Wilson");
      expect(johns.length).toBeGreaterThan(0);
      expect(janes.length).toBeGreaterThan(0);
      expect(bobs.length).toBeGreaterThan(0);
    });

    it("renders student scores with correct formatting", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      // Scores appear in both mobile and desktop views
      const eightyFives = screen.getAllByText("85%");
      const sixtyFives = screen.getAllByText("65%");
      expect(eightyFives.length).toBeGreaterThan(0);
      expect(sixtyFives.length).toBeGreaterThan(0);
    });

    it("renders skill level badges", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      // Skill levels appear in both mobile and desktop views + legend
      const advancedBadges = screen.getAllByText("Advanced");
      const intermediateBadges = screen.getAllByText("Intermediate");
      const noDataBadges = screen.getAllByText("No Data");
      expect(advancedBadges.length).toBeGreaterThan(0);
      expect(intermediateBadges.length).toBeGreaterThan(0);
      expect(noDataBadges.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("shows empty state when no students enrolled", async () => {
      mockGetClassAssessmentResults.mockResolvedValue({
        success: true,
        data: { ...mockClassResults, results: [] },
      });

      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      expect(screen.getByText("📭")).toBeInTheDocument();
      expect(screen.getByText("No students enrolled yet")).toBeInTheDocument();
      expect(screen.getByText("View Class Details")).toBeInTheDocument();
    });
  });

  describe("score levels legend", () => {
    it("renders score levels legend", async () => {
      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      expect(screen.getByText("Score Levels")).toBeInTheDocument();
      expect(screen.getByText("Advanced (80%+)")).toBeInTheDocument();
      expect(screen.getByText("Intermediate (60-79%)")).toBeInTheDocument();
      expect(screen.getByText(/Beginner/)).toBeInTheDocument();
    });
  });
});

// Test helper functions separately
describe("Helper functions", () => {
  describe("formatRelativeTime", () => {
    // Test the function indirectly through rendered output
    it("shows Today for recent dates", async () => {
      const mockGetUser = jest.requireMock("@/lib/supabase-server").createClient;
      mockGetUser.mockResolvedValue({
        auth: {
          getUser: () => ({
            data: { user: { id: "user-1", app_metadata: { role: "teacher" } } },
          }),
        },
      });

      const mockResults = {
        success: true,
        data: {
          className: "Test",
          totalStudents: 1,
          studentsWithAssessments: 1,
          classAverageScore: 75,
          results: [{
            studentId: "s1",
            studentName: "Test Student",
            rollNumber: "001",
            averageScore: 75,
            sessionsCompleted: 1,
            correctAnswers: 15,
            totalQuestions: 20,
            lastAssessmentDate: new Date().toISOString(),
          }],
        },
      };
      mockGetClassAssessmentResults.mockResolvedValue(mockResults);

      const Component = await ClassAssessmentResultsPage({
        params: Promise.resolve({ classId: "class-123" }),
      });
      render(Component);

      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });
});
