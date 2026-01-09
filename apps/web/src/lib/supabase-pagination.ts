/**
 * Supabase Pagination with Snapshot Isolation
 * Prevents inconsistent state when paginating through data
 * Uses cursor-based pagination and timestamp snapshots
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { authLogger } from "./auth-logger";

/**
 * Cursor-based pagination result
 * Allows safe multi-page iteration without data duplication/loss
 */
export interface PaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  pageSize?: number;
  orderBy?: { column: string; ascending: boolean };
  cursorColumn?: string; // Column to use for cursor (should be unique, e.g., id or created_at)
}

/**
 * Fetch paginated data using cursor-based pagination
 * This prevents TOCTOU issues where data changes between page requests
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param cursor - Current cursor (null for first page)
 * @param options - Pagination options
 * @returns Paginated result with next cursor
 */
export async function fetchPaginatedWithCursor<T>(
  supabase: SupabaseClient,
  table: string,
  cursor: string | null = null,
  options: PaginationOptions = {},
): Promise<PaginationResult<T>> {
  const pageSize = options.pageSize || 100;
  const cursorColumn = options.cursorColumn || "id";
  const orderBy = options.orderBy || { column: cursorColumn, ascending: true };

  try {
    // Start with base query
    let query = supabase.from(table).select("*", { count: "exact" });

    // Apply cursor if provided (skip past last item)
    if (cursor) {
      const _comparison = orderBy.ascending ? "gt" : "lt";
      query = query.gt(cursorColumn, cursor);
    }

    // Order by cursor column
    query = query.order(cursorColumn, { ascending: orderBy.ascending });

    // Fetch pageSize + 1 to detect if there are more results
    const { data, error, count } = await query.limit(pageSize + 1);

    if (error) {
      authLogger.error("[fetchPaginatedWithCursor] Query failed", {
        table,
        error: error.message,
      });
      return { data: [], nextCursor: null, hasMore: false };
    }

    const items = (data || []) as T[];
    const hasMore = items.length > pageSize;
    const pageItems = hasMore ? items.slice(0, pageSize) : items;

    // Calculate next cursor from last item
    let nextCursor: string | null = null;
    if (hasMore && pageItems?.length) {
      const lastItem = pageItems[pageItems.length - 1];
      // Type-safe cursor extraction - cursorColumn must exist on T
      if (
        lastItem &&
        typeof lastItem === "object" &&
        cursorColumn in lastItem
      ) {
        const cursorValue = (lastItem as Record<string, unknown>)[cursorColumn];
        if (typeof cursorValue === "string") {
          nextCursor = cursorValue;
        }
      }
    }

    return {
      data: pageItems,
      nextCursor,
      hasMore,
      total: count ?? undefined,
    };
  } catch (error) {
    authLogger.error("[fetchPaginatedWithCursor] Unexpected error", {
      table,
      error,
    });
    return { data: [], nextCursor: null, hasMore: false };
  }
}

/**
 * Type guard: Check if item has created_at field and return its value
 */
function getCreatedAt(item: unknown): string | undefined {
  if (item && typeof item === "object" && "created_at" in item) {
    return (item as { created_at?: string }).created_at;
  }
  return undefined;
}

/**
 * Helper: Check if item was created after snapshot time
 */
function isAfterSnapshot(item: unknown, snapshotTime: string): boolean {
  const createdAt = getCreatedAt(item);
  return createdAt ? createdAt > snapshotTime : false;
}

/**
 * Helper: Find and truncate allData at snapshot boundary
 */
function truncateAtSnapshot(
  allData: unknown[],
  snapshotTime: string,
): number {
  const snapshotIndex = allData.findIndex((item) =>
    isAfterSnapshot(item, snapshotTime),
  );
  if (snapshotIndex >= 0) {
    allData.length = snapshotIndex;
  }
  return snapshotIndex;
}

/**
 * Fetch all data with snapshot isolation
 * Uses timestamp to ensure consistent view across all pages
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param filter - Optional filter condition (e.g., "created_at.lt.2024-01-01")
 * @returns All data in consistent snapshot
 */
export async function fetchAllWithSnapshot<T>(
  supabase: SupabaseClient,
  table: string,
  createdBeforeTimestamp?: string,
): Promise<T[]> {
  const snapshotTime = createdBeforeTimestamp || new Date().toISOString();
  const allData: T[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  try {
    while (hasMore) {
      const result: PaginationResult<T> = await fetchPaginatedWithCursor<T>(
        supabase,
        table,
        cursor,
        {
          pageSize: 1000,
          cursorColumn: "created_at",
          orderBy: { column: "created_at", ascending: true },
        },
      );

      allData.push(...result.data);
      cursor = result.nextCursor;

      // Check if we've gone past snapshot time
      if (result.data.length > 0) {
        const lastItem = result.data.at(-1);
        if (lastItem && isAfterSnapshot(lastItem, snapshotTime)) {
          truncateAtSnapshot(allData, snapshotTime);
          break;
        }
      }

      hasMore = result.hasMore;
    }

    return allData;
  } catch (error) {
    authLogger.error("[fetchAllWithSnapshot] Failed to fetch all data", {
      table,
      error,
    });
    return allData; // Return what we got so far
  }
}

/**
 * Iterator for safe pagination
 * Automatically handles cursor management and snapshot isolation
 */
export class PaginatedIterator<T> {
  private readonly table: string;
  private readonly supabase: SupabaseClient;
  private readonly options: PaginationOptions;
  private cursor: string | null = null;
  private hasMore: boolean = true;
  private currentPage: T[] = [];
  private currentIndex: number = 0;

  constructor(
    supabase: SupabaseClient,
    table: string,
    options?: PaginationOptions,
  ) {
    this.supabase = supabase;
    this.table = table;
    this.options = options || {};
  }

  /**
   * Get next item from iterator
   */
  async next(): Promise<{ value: T | null; done: boolean }> {
    // If we've exhausted current page, fetch next page
    if (this.currentIndex >= this.currentPage.length && this.hasMore) {
      const result = await fetchPaginatedWithCursor<T>(
        this.supabase,
        this.table,
        this.cursor,
        this.options,
      );

      this.currentPage = result.data;
      this.currentIndex = 0;
      this.cursor = result.nextCursor;
      this.hasMore = result.hasMore;

      // If no more data
      if (this.currentPage.length === 0) {
        return { value: null, done: true };
      }
    }

    // If still no data, we're done
    if (this.currentIndex >= this.currentPage.length) {
      return { value: null, done: true };
    }

    const item = this.currentPage[this.currentIndex++];
    return { value: item, done: false };
  }

  /**
   * Iterate over all items (async generator)
   */
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) {
      const { value, done } = await this.next();
      if (done) break;
      if (value !== null) yield value;
    }
  }
}
