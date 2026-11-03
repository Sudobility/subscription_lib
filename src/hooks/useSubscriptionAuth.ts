/**
 * useSubscriptionAuth Hook
 *
 * Centralizes auth state → subscription user ID synchronization.
 * Call once at app root to keep subscription_lib's singleton in sync
 * with the current authenticated user.
 */

import { useEffect, useState } from 'react';
import { setCurrentUser } from '@sudobility/di';
import {
  getSubscriptionInstance,
  isSubscriptionInitialized,
  onSubscriptionRefresh,
  onSubscriptionUserIdChange,
} from '../core/singleton';

/**
 * Options for useSubscriptionAuth hook
 */
export interface UseSubscriptionAuthOptions {
  /** Firebase UID or equivalent. undefined = anonymous / logged out. */
  userId: string | undefined;
  /** Optional email for RevenueCat attributes */
  userEmail?: string;
  /** True while the auth provider is still loading */
  isAuthLoading: boolean;
}

/**
 * Result of useSubscriptionAuth hook
 */
export interface UseSubscriptionAuthResult {
  /** True once the subscription user is synced and customer info loaded */
  isReady: boolean;
  /** Active entitlement identifiers (empty when not ready) */
  entitlements: string[];
}

/**
 * Hook that synchronizes auth state with subscription_lib's singleton.
 *
 * - `isAuthLoading=true` → no-op, returns `isReady: false`
 * - `userId=undefined` (anonymous/logout) → clears the subscription user
 * - `userId="abc"` → sets the user, loads customer info, returns entitlements
 *
 * @example
 * ```tsx
 * function SubscriptionInitializer({ children }) {
 *   const { user, loading } = useAuthStatus();
 *   const { isReady, entitlements } = useSubscriptionAuth({
 *     userId: (!loading && user && !user.isAnonymous) ? user.uid : undefined,
 *     userEmail: user?.email ?? undefined,
 *     isAuthLoading: loading,
 *   });
 *   return <EntitlementProvider entitlements={entitlements}>{children}</EntitlementProvider>;
 * }
 * ```
 */
export function useSubscriptionAuth(
  options: UseSubscriptionAuthOptions
): UseSubscriptionAuthResult {
  const { userId, isAuthLoading } = options;
  const [isReady, setIsReady] = useState(false);
  const [entitlements, setEntitlements] = useState<string[]>([]);

  // Push the current user into di (the fleet's current-user seam). The
  // subscription singleton syncs the store adapter and clears customer info.
  useEffect(() => {
    if (isAuthLoading) return;
    setCurrentUser({ userId, isLoggedIn: !!userId });
  }, [userId, isAuthLoading]);

  // Load customer info and reflect entitlements once the user is synced (the
  // adapter is ready by the time onSubscriptionUserIdChange fires) and after
  // refreshes (e.g. a purchase).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSubscriptionInitialized() || !userId) {
        setEntitlements([]);
        setIsReady(false);
        return;
      }
      try {
        const service = getSubscriptionInstance();
        await service.loadCustomerInfo();
        if (cancelled) return;
        const sub = service.getCurrentSubscription();
        setEntitlements(sub?.entitlements ?? []);
        setIsReady(true);
      } catch (err) {
        console.error(
          '[useSubscriptionAuth] Failed to load subscription:',
          err
        );
        if (!cancelled) {
          setEntitlements([]);
          setIsReady(false);
        }
      }
    }

    void load();

    const unsubscribeUserId = onSubscriptionUserIdChange(() => {
      void load();
    });
    const unsubscribeRefresh = onSubscriptionRefresh(() => {
      if (isSubscriptionInitialized()) {
        const sub = getSubscriptionInstance().getCurrentSubscription();
        setEntitlements(sub?.entitlements ?? []);
        setIsReady(!!userId);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeUserId();
      unsubscribeRefresh();
    };
  }, [userId]);

  return { isReady, entitlements };
}
