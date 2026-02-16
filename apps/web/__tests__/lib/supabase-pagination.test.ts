/**
 * Tests for supabase-pagination.ts
 * Tests cursor-based pagination and snapshot isolation
 */

// Mock functions
const mockSelect = jest.fn();
const mockGt = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  fetchPaginatedWithCursor,
  fetchAllWithSnapshot,
  PaginatedIterator,
  PaginationResult,
} from "@/lib/supabase-pagination";
import { authLogger } from "@/lib/auth-logger";
import { SupabaseClient } from "@supabase/supabase-js";

describe("supabase-pagination", () => {
  // Create a mock supabase client with chainable methods
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockLimit.mockReset();
    mockOrder.mockReset();
    mockGt.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReset();

    // Set up default chain
    mockLimit.mockResolvedValue({ data: [], error: null, count: 0 });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockGt.mockReturnValue({ order: mockOrder, limit: mockLimit });
    mockSelect.mockReturnValue({ gt: mockGt, order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockSupabase = {
      from: mockFrom as unknown as SupabaseClient["from"],
    };
  });

  describe("fetchPaginatedWithCursor", () => {
    it("should fetch first page without cursor", async () => {
      const mockData = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 2 });

      const result = await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(mockFrom).toHaveBeenCalledWith("test_table");
      expect(mockSelect).toHaveBeenCalledWith("*", { count: "exact" });
      expect(result.data).toEqual(mockData);
      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(2);
    });

    it("should use cursor for subsequent pages", async () => {
      const mockData = [
        { id: "3", name: "Item 3" },
        { id: "4", name: "Item 4" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 4 });

      await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table",
        "2" // cursor
      );

      expect(mockGt).toHaveBeenCalledWith("id", "2");
    });

    it("should detect when there are more results", async () => {
      // Return pageSize + 1 items to indicate more results
      const mockData = Array.from({ length: 101 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`,
      }));
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 200 });

      const result = await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(100); // Only returns pageSize items
      expect(result.nextCursor).toBe("100"); // Last item's id
    });

    it("should use custom pageSize", async () => {
      const mockData = [{ id: "1", name: "Item 1" }];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 1 });

      await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table",
        null,
        { pageSize: 50 }
      );

      expect(mockLimit).toHaveBeenCalledWith(51); // pageSize + 1
    });

    it("should use custom cursorColumn", async () => {
      const mockData = [{ created_at: "2024-01-01", name: "Item 1" }];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 1 });

      await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table",
        "2024-01-01",
        { cursorColumn: "created_at" }
      );

      expect(mockGt).toHaveBeenCalledWith("created_at", "2024-01-01");
    });

    it("should use custom orderBy options", async () => {
      const mockData = [{ id: "1", name: "Item 1" }];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 1 });

      await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table",
        null,
        {
          orderBy: { column: "created_at", ascending: false },
          cursorColumn: "created_at",
        }
      );

      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("should handle query errors gracefully", async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
        count: null,
      });

      const result = await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[fetchPaginatedWithCursor] Query failed",
        expect.objectContaining({ table: "test_table" })
      );
    });

    it("should handle exceptions gracefully", async () => {
      mockLimit.mockRejectedValue(new Error("Network error"));

      const result = await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[fetchPaginatedWithCursor] Unexpected error",
        expect.objectContaining({ table: "test_table" })
      );
    });

    it("should handle null data response", async () => {
      mockLimit.mockResolvedValue({ data: null, error: null, count: null });

      const result = await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it("should handle non-string cursor values", async () => {
      // Test with numeric cursor column value that won't be extracted
      const mockData = Array.from({ length: 101 }, (_, i) => ({
        id: i + 1, // numeric, not string
        name: `Item ${i + 1}`,
      }));
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 200 });

      const result = await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeNull(); // Can't extract non-string cursor
    });

    it("should return undefined total when count is null", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null, count: null });

      const result = await fetchPaginatedWithCursor(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(result.total).toBeUndefined();
    });
  });

  describe("fetchAllWithSnapshot", () => {
    it("should fetch all data in a single page", async () => {
      const mockData = [
        { id: "1", created_at: "2024-01-01T00:00:00Z", name: "Item 1" },
        { id: "2", created_at: "2024-01-02T00:00:00Z", name: "Item 2" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 2 });

      const result = await fetchAllWithSnapshot(
        mockSupabase as SupabaseClient,
        "test_table",
        "2024-12-31T23:59:59Z"
      );

      expect(result).toHaveLength(2);
    });

    it("should stop at snapshot boundary", async () => {
      // First call returns data before snapshot
      const firstPageData = [
        { id: "1", created_at: "2024-01-01T00:00:00Z", name: "Item 1" },
        { id: "2", created_at: "2024-06-01T00:00:00Z", name: "Item 2" },
      ];
      // Make hasMore true by returning pageSize + 1 items
      const fullFirstPage = [
        ...firstPageData,
        ...Array.from({ length: 999 }, (_, i) => ({
          id: String(i + 3),
          created_at: "2024-06-15T00:00:00Z",
          name: `Item ${i + 3}`,
        })),
      ];

      // Second call returns data after snapshot
      const secondPageData = [
        { id: "1002", created_at: "2024-07-01T00:00:00Z", name: "Item After" },
      ];

      mockLimit
        .mockResolvedValueOnce({
          data: fullFirstPage,
          error: null,
          count: 1500,
        })
        .mockResolvedValueOnce({
          data: secondPageData,
          error: null,
          count: 1500,
        });

      // Snapshot time is June 30 - should stop before July data
      const result = await fetchAllWithSnapshot(
        mockSupabase as SupabaseClient,
        "test_table",
        "2024-06-30T00:00:00Z"
      );

      // Should only include items before snapshot
      expect(
        result.every(
          (item: { created_at: string }) =>
            item.created_at <= "2024-06-30T00:00:00Z"
        )
      ).toBe(true);
    });

    it("should use current time as default snapshot", async () => {
      const mockData = [
        { id: "1", created_at: "2024-01-01T00:00:00Z", name: "Item 1" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 1 });

      // Don't provide timestamp, should use current time
      const result = await fetchAllWithSnapshot(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      expect(result).toHaveLength(1);
    });

    it("should handle errors and return partial data", async () => {
      // First page has more (returns 1001 items to trigger hasMore)
      const firstPageData = Array.from({ length: 1001 }, (_, i) => ({
        id: String(i + 1),
        created_at: "2024-01-01T00:00:00Z",
        name: `Item ${i + 1}`,
      }));

      mockLimit
        .mockResolvedValueOnce({
          data: firstPageData,
          error: null,
          count: 2000,
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchAllWithSnapshot(
        mockSupabase as SupabaseClient,
        "test_table",
        "2024-12-31T23:59:59Z"
      );

      // Should return first page data even after error
      expect(result.length).toBeGreaterThan(0);
      // Error is handled by fetchPaginatedWithCursor, so check that one
      expect(authLogger.error).toHaveBeenCalledWith(
        "[fetchPaginatedWithCursor] Unexpected error",
        expect.any(Object)
      );
    });

    it("should handle empty results", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null, count: 0 });

      const result = await fetchAllWithSnapshot(
        mockSupabase as SupabaseClient,
        "test_table",
        "2024-12-31T23:59:59Z"
      );

      expect(result).toEqual([]);
    });
  });

  describe("PaginatedIterator", () => {
    it("should iterate over single page of results", async () => {
      const mockData = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 2 });

      const iterator = new PaginatedIterator(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      const item1 = await iterator.next();
      expect(item1.value).toEqual({ id: "1", name: "Item 1" });
      expect(item1.done).toBe(false);

      const item2 = await iterator.next();
      expect(item2.value).toEqual({ id: "2", name: "Item 2" });
      expect(item2.done).toBe(false);

      const item3 = await iterator.next();
      expect(item3.value).toBeNull();
      expect(item3.done).toBe(true);
    });

    it("should iterate over multiple pages", async () => {
      // First page has more results
      const firstPage = Array.from({ length: 101 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`,
      }));
      // Second page is the last
      const secondPage = [
        { id: "102", name: "Item 102" },
        { id: "103", name: "Item 103" },
      ];

      mockLimit
        .mockResolvedValueOnce({ data: firstPage, error: null, count: 103 })
        .mockResolvedValueOnce({ data: secondPage, error: null, count: 103 });

      const iterator = new PaginatedIterator(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      const items: Array<{ id: string; name: string }> = [];
      let result = await iterator.next();
      while (!result.done) {
        if (result.value) items.push(result.value);
        result = await iterator.next();
      }

      expect(items).toHaveLength(102); // 100 from first page + 2 from second
    });

    it("should handle empty results", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null, count: 0 });

      const iterator = new PaginatedIterator(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      const result = await iterator.next();
      expect(result.value).toBeNull();
      expect(result.done).toBe(true);
    });

    it("should work with async iterator protocol", async () => {
      const mockData = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 2 });

      const iterator = new PaginatedIterator(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      const items: Array<{ id: string; name: string }> = [];
      for await (const item of iterator) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: "1", name: "Item 1" });
    });

    it("should accept custom pagination options", async () => {
      const mockData = [
        { created_at: "2024-01-01", name: "Item 1" },
        { created_at: "2024-01-02", name: "Item 2" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 2 });

      const iterator = new PaginatedIterator(
        mockSupabase as SupabaseClient,
        "test_table",
        {
          pageSize: 50,
          cursorColumn: "created_at",
          orderBy: { column: "created_at", ascending: true },
        }
      );

      await iterator.next();

      expect(mockLimit).toHaveBeenCalledWith(51); // pageSize + 1
    });

    it("should continue iterating when current page is exhausted but hasMore is true", async () => {
      // First page - exactly pageSize items means hasMore should be checked
      const firstPage = Array.from({ length: 101 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${i + 1}`,
      }));
      const secondPage = [{ id: "102", name: "Item 102" }];

      mockLimit
        .mockResolvedValueOnce({ data: firstPage, error: null, count: 102 })
        .mockResolvedValueOnce({ data: secondPage, error: null, count: 102 });

      const iterator = new PaginatedIterator(
        mockSupabase as SupabaseClient,
        "test_table"
      );

      const items: Array<{ id: string; name: string }> = [];
      for await (const item of iterator) {
        items.push(item);
      }

      expect(items).toHaveLength(101); // 100 from first page + 1 from second
    });
  });

  describe("helper functions (internal)", () => {
    // Test edge cases through fetchAllWithSnapshot which uses the helpers
    it("should handle items without created_at field", async () => {
      const mockData = [
        { id: "1", name: "Item without created_at" }, // No created_at
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 1 });

      const result = await fetchAllWithSnapshot(
        mockSupabase as SupabaseClient,
        "test_table",
        "2024-06-30T00:00:00Z"
      );

      // Should include item since it doesn't have created_at to compare
      expect(result).toHaveLength(1);
    });

    it("should properly truncate at snapshot boundary", async () => {
      // Items that span the snapshot boundary
      const mockData = [
        { id: "1", created_at: "2024-06-01T00:00:00Z", name: "Before" },
        { id: "2", created_at: "2024-06-15T00:00:00Z", name: "Before2" },
        { id: "3", created_at: "2024-07-01T00:00:00Z", name: "After" }, // After snapshot
        { id: "4", created_at: "2024-07-15T00:00:00Z", name: "After2" },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null, count: 4 });

      const result = await fetchAllWithSnapshot(
        mockSupabase as SupabaseClient,
        "test_table",
        "2024-06-30T00:00:00Z" // Snapshot at end of June
      );

      // Should only include items before snapshot
      expect(result).toHaveLength(2);
      expect(result.map((item: { id: string }) => item.id)).toEqual(["1", "2"]);
    });
  });
});
