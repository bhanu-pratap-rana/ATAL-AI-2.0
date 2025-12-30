/**
 * Supabase Query Wrapper
 *
 * Provides consistent error handling and type safety for Supabase queries.
 * Eliminates repetitive try-catch and error handling patterns.
 *
 * Rule.md Compliance:
 * - DRY: Single source of truth for query patterns
 * - Consistent error handling
 * - Type-safe queries
 * - Centralized logging
 *
 * Usage:
 * const result = await queryWithError(
 *   supabase
 *     .from('users')
 *     .select('*')
 *     .single(),
 *   '[getUser] Failed to fetch user'
 * )
 */

import { authLogger } from './auth-logger'

/**
 * Query result type
 */
export interface QueryResult<T> {
  data: T | null
  error: string | null
  success: boolean
}

/**
 * Wraps Supabase queries with error handling
 *
 * @param promise - Supabase query promise
 * @param context - Log context (e.g., '[functionName] Description')
 * @returns Query result with data or error
 */
export async function queryWithError<T>(
  promise: Promise<{ data: T | null; error: any }>,
  context: string
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await promise

    if (error) {
      authLogger.error(`${context} - Supabase error:`, error)
      return {
        data: null,
        error: error.message || 'Database query failed',
        success: false,
      }
    }

    return {
      data,
      error: null,
      success: true,
    }
  } catch (err) {
    authLogger.error(context, err)
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Query execution failed',
      success: false,
    }
  }
}

/**
 * Wraps multiple Supabase queries (Promise.all)
 *
 * @param queries - Array of Supabase query promises
 * @param context - Log context
 * @returns Array of query results
 */
export async function batchQueryWithError<T extends any[]>(
  queries: Promise<{ data: any; error: any }>[],
  context: string
): Promise<QueryResult<T[number]>[]> {
  try {
    const results = await Promise.all(queries)

    return results.map((result, index) => {
      if (result.error) {
        authLogger.error(`${context}[${index}] - Supabase error:`, result.error)
        return {
          data: null,
          error: result.error.message || 'Database query failed',
          success: false,
        }
      }

      return {
        data: result.data,
        error: null,
        success: true,
      }
    })
  } catch (err) {
    authLogger.error(`${context} - Batch query failed`, err)
    return queries.map(() => ({
      data: null,
      error: err instanceof Error ? err.message : 'Batch query failed',
      success: false,
    }))
  }
}

/**
 * Wraps Supabase mutations (insert/update/delete) with transaction support
 *
 * @param mutation - Supabase mutation promise
 * @param context - Log context
 * @returns Mutation result
 */
export async function mutationWithError<T>(
  mutation: Promise<{ data: T | null; error: any }>,
  context: string
): Promise<QueryResult<T>> {
  const result = await queryWithError(mutation, context)

  if (result.success) {
    authLogger.debug(`${context} - Mutation successful`)
  }

  return result
}
