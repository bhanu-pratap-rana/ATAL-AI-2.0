/**
 * Authentication Result Type
 * Used for representing auth verification results across server actions
 */

/**
 * Standardized auth result structure for action guards
 */
export interface AuthResult {
  authorized: boolean;
  // When authorized is true, user is always present
  user: {
    id: string;
  };
  error?: string;
}
