/**
 * Feature Flags System
 *
 * Enables safe gradual rollouts, A/B testing, and emergency kill switches.
 * 
 * Features:
 * - Percentage-based rollouts (0-100%)
 * - User whitelisting for early access
 * - Server-side and client-side checks
 * - Caching for performance
 *
 * Usage:
 * ```typescript
 * // Server-side
 * const enabled = await isFeatureEnabled('voice_ai_tutor', user.id);
 * 
 * // Client-side
 * const enabled = await isFeatureEnabledClient('voice_ai_tutor', user.id);
 * ```
 */

import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient as createBrowserClient } from '@/lib/supabase-browser';
import { authLogger } from '@/lib/auth-logger';
import { clientLogger } from '@/lib/client-logger';

/**
 * Hash a user ID to a consistent number for percentage-based rollouts
 * Uses simple string hashing algorithm
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a feature is enabled for a user (server-side)
 * 
 * @param flagId - Feature flag ID
 * @param userId - User ID (optional, for percentage-based rollouts)
 * @returns Promise<boolean> - Whether the feature is enabled
 */
export async function isFeatureEnabled(
  flagId: string,
  userId?: string
): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    
    // OPTIMIZATION: Select only needed columns instead of *
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .select('id, name, enabled, rollout_percentage, whitelist_user_ids')
      .eq('id', flagId)
      .single();
    
    if (error || !flag) {
      authLogger.warn('[FeatureFlags] Flag not found or error:', {
        flagId,
        error: error?.message,
      });
      return false;
    }
    
    // If flag is disabled globally, return false
    if (!flag.enabled) {
      return false;
    }
    
    // If no user ID provided, check if rollout is 100%
    if (!userId) {
      return flag.rollout_percentage === 100;
    }
    
    // Check whitelist first (takes precedence)
    if (flag.whitelist_user_ids && flag.whitelist_user_ids.includes(userId)) {
      authLogger.debug('[FeatureFlags] User in whitelist:', { flagId, userId });
      return true;
    }
    
    // Check rollout percentage
    const hash = hashUserId(userId);
    const isEnabled = (hash % 100) < flag.rollout_percentage;
    
    authLogger.debug('[FeatureFlags] Rollout check:', {
      flagId,
      userId,
      hash,
      rolloutPercentage: flag.rollout_percentage,
      isEnabled,
    });
    
    return isEnabled;
  } catch (error) {
    authLogger.error('[FeatureFlags] Error checking feature flag:', {
      flagId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Check if a feature is enabled for a user (client-side)
 * 
 * @param flagId - Feature flag ID
 * @param userId - User ID (optional, for percentage-based rollouts)
 * @returns Promise<boolean> - Whether the feature is enabled
 */
export async function isFeatureEnabledClient(
  flagId: string,
  userId?: string
): Promise<boolean> {
  try {
    const supabase = createBrowserClient();
    
    // OPTIMIZATION: Select only needed columns instead of *
    const { data: flag, error } = await supabase
      .from('feature_flags')
      .select('id, name, enabled, rollout_percentage, whitelist_user_ids')
      .eq('id', flagId)
      .single();
    
    if (error || !flag) {
      clientLogger.warn('[FeatureFlags] Flag not found or error:', {
        flagId,
        error: error?.message,
      });
      return false;
    }
    
    // If flag is disabled globally, return false
    if (!flag.enabled) {
      return false;
    }
    
    // If no user ID provided, check if rollout is 100%
    if (!userId) {
      return flag.rollout_percentage === 100;
    }
    
    // Check whitelist first (takes precedence)
    if (flag.whitelist_user_ids && flag.whitelist_user_ids.includes(userId)) {
      clientLogger.debug('[FeatureFlags] User in whitelist:', { flagId, userId });
      return true;
    }
    
    // Check rollout percentage
    const hash = hashUserId(userId);
    const isEnabled = (hash % 100) < flag.rollout_percentage;
    
    clientLogger.debug('[FeatureFlags] Rollout check:', {
      flagId,
      userId,
      hash,
      rolloutPercentage: flag.rollout_percentage,
      isEnabled,
    });
    
    return isEnabled;
  } catch (error) {
    clientLogger.error('[FeatureFlags] Error checking feature flag:', {
      flagId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get all enabled feature flags for a user
 * Useful for bulk checks and debugging
 */
export async function getEnabledFeatures(userId: string): Promise<string[]> {
  try {
    const supabase = await createServerClient();
    
    // OPTIMIZATION: Select only needed columns instead of *
    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('id, name, enabled, rollout_percentage, whitelist_user_ids')
      .eq('enabled', true);
    
    if (error || !flags) {
      authLogger.warn('[FeatureFlags] Error fetching flags:', { error: error?.message });
      return [];
    }
    
    const enabledFlags: string[] = [];
    
    for (const flag of flags) {
      // Check whitelist
      if (flag.whitelist_user_ids && flag.whitelist_user_ids.includes(userId)) {
        enabledFlags.push(flag.id);
        continue;
      }
      
      // Check rollout percentage
      const hash = hashUserId(userId);
      if ((hash % 100) < flag.rollout_percentage) {
        enabledFlags.push(flag.id);
      }
    }
    
    return enabledFlags;
  } catch (error) {
    authLogger.error('[FeatureFlags] Error getting enabled features:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

