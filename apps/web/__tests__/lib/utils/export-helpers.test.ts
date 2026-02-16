/**
 * Tests for export-helpers.ts
 * Target: ~20 tests covering CSV/JSON export utilities
 */

import {
  convertToCSV,
  downloadCSV,
  downloadJSON,
  formatForExport,
  EXPORT_CONFIGS,
} from "@/lib/utils/export-helpers";

describe("export-helpers", () => {
  // Mock DOM APIs
  const mockClick = jest.fn();
  const mockRemove = jest.fn();
  const mockSetAttribute = jest.fn();
  const mockCreateObjectURL = jest.fn();
  const mockRevokeObjectURL = jest.fn();

  let mockAnchor: HTMLAnchorElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementation
    mockCreateObjectURL.mockReturnValue("blob:test-url");

    // Create mock anchor element
    mockAnchor = {
      setAttribute: mockSetAttribute,
      click: mockClick,
      remove: mockRemove,
      style: {},
    } as unknown as HTMLAnchorElement;

    // Spy on document.createElement
    jest.spyOn(document, "createElement").mockReturnValue(mockAnchor);
    jest.spyOn(document.body, "appendChild").mockImplementation((node) => node);

    // Mock URL
    Object.defineProperty(global, "URL", {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("convertToCSV", () => {
    it("should convert array of objects to CSV", () => {
      const data = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];

      const csv = convertToCSV(data);

      expect(csv).toContain("name,age");
      expect(csv).toContain("Alice,30");
      expect(csv).toContain("Bob,25");
    });

    it("should return empty string for empty array", () => {
      const csv = convertToCSV([]);
      expect(csv).toBe("");
    });

    it("should escape fields with commas", () => {
      const data = [{ name: "Doe, John", age: 30 }];

      const csv = convertToCSV(data);

      expect(csv).toContain('"Doe, John"');
    });

    it("should escape fields with quotes", () => {
      const data = [{ name: 'John "JD" Doe', age: 30 }];

      const csv = convertToCSV(data);

      expect(csv).toContain('"John ""JD"" Doe"');
    });

    it("should escape fields with newlines", () => {
      const data = [{ name: "John\nDoe", age: 30 }];

      const csv = convertToCSV(data);

      expect(csv).toContain('"John\nDoe"');
    });

    it("should handle null values", () => {
      const data = [{ name: "John", value: null }];

      const csv = convertToCSV(data as unknown as Record<string, unknown>[]);

      expect(csv).toContain("name,value");
      expect(csv).toContain("John,");
    });

    it("should handle undefined values", () => {
      const data = [{ name: "John", value: undefined }];

      const csv = convertToCSV(data as unknown as Record<string, unknown>[]);

      expect(csv).toContain("John,");
    });

    it("should handle objects as empty strings", () => {
      const data = [{ name: "John", obj: { nested: true } }];

      const csv = convertToCSV(data as unknown as Record<string, unknown>[]);

      // Objects should be converted to empty string
      expect(csv).toContain("John,");
    });

    it("should convert numbers to strings", () => {
      const data = [{ value: 42.5, count: 100 }];

      const csv = convertToCSV(data);

      expect(csv).toContain("42.5,100");
    });
  });

  describe("downloadCSV", () => {
    it("should create and trigger download", () => {
      const data = [{ name: "Test" }];

      downloadCSV(data, "test-file");

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(mockSetAttribute).toHaveBeenCalledWith("href", "blob:test-url");
      expect(mockSetAttribute).toHaveBeenCalledWith(
        "download",
        expect.stringContaining("test-file")
      );
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });

    it("should include date in filename", () => {
      const data = [{ name: "Test" }];

      downloadCSV(data, "export");

      // Check that filename contains date pattern
      expect(mockSetAttribute).toHaveBeenCalledWith(
        "download",
        expect.stringMatching(/export-\d{4}-\d{2}-\d{2}\.csv/)
      );
    });
  });

  describe("downloadJSON", () => {
    it("should create JSON download", () => {
      const data = { test: "value" };

      downloadJSON(data, "test-file");

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(mockSetAttribute).toHaveBeenCalledWith(
        "download",
        expect.stringContaining("test-file")
      );
      expect(mockSetAttribute).toHaveBeenCalledWith(
        "download",
        expect.stringContaining(".json")
      );
    });
  });

  describe("formatForExport", () => {
    it("should return all data when no columns specified", () => {
      const data = [
        { name: "Alice", age: 30, city: "NYC" },
        { name: "Bob", age: 25, city: "LA" },
      ];

      const result = formatForExport(data);

      expect(result).toEqual(data);
    });

    it("should filter to specified columns", () => {
      const data = [
        { name: "Alice", age: 30, city: "NYC" },
        { name: "Bob", age: 25, city: "LA" },
      ];

      const result = formatForExport(data, ["name", "city"]);

      expect(result).toEqual([
        { name: "Alice", city: "NYC" },
        { name: "Bob", city: "LA" },
      ]);
    });

    it("should return empty array for empty input", () => {
      const result = formatForExport([]);
      expect(result).toEqual([]);
    });

    it("should ignore non-existent columns", () => {
      const data = [{ name: "Alice", age: 30 }];

      const result = formatForExport(data, ["name", "nonexistent"]);

      expect(result).toEqual([{ name: "Alice" }]);
    });
  });

  describe("EXPORT_CONFIGS", () => {
    it("should have studentProgress config", () => {
      expect(EXPORT_CONFIGS.studentProgress).toBeDefined();
      expect(EXPORT_CONFIGS.studentProgress.filename).toBe("student-progress");
      expect(EXPORT_CONFIGS.studentProgress.columns).toContain("name");
      expect(EXPORT_CONFIGS.studentProgress.columns).toContain("mastery_score");
    });

    it("should have aiInteractions config", () => {
      expect(EXPORT_CONFIGS.aiInteractions).toBeDefined();
      expect(EXPORT_CONFIGS.aiInteractions.filename).toBe("ai-interactions");
      expect(EXPORT_CONFIGS.aiInteractions.columns).toContain("message");
      expect(EXPORT_CONFIGS.aiInteractions.columns).toContain("language");
    });

    it("should have assessmentResults config", () => {
      expect(EXPORT_CONFIGS.assessmentResults).toBeDefined();
      expect(EXPORT_CONFIGS.assessmentResults.filename).toBe("assessment-results");
      expect(EXPORT_CONFIGS.assessmentResults.columns).toContain("score");
      expect(EXPORT_CONFIGS.assessmentResults.columns).toContain("submitted_at");
    });
  });
});
