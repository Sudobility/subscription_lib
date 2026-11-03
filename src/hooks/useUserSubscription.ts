/**
 * useUserSubscription Hook
 *
 * Fetch and manage current user's subscription status.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CurrentSubscription } from '../types/subscription';
import {
  getSubscriptionInstance,
  isSubscriptionInitialized,
  onSubscriptionRefresh,
  onSubscriptionUserIdChange,
} from '../core/singleton';
import { useIsUserSubscribable } from './useIsUserSubscribable';

/**
 * Result of useUserSubscription hook
 */
export interface UseUserSubscriptionResult {
  /** Current subscription info, null if loading */
  subscription: CurrentSubscription | null;
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Force refresh customer subscription data from the server */
  update: () => Promise<void>;
  /** @deprecated Use update() instead */
  refetch: () => Promise<void>;
}

/**
 * Options for useUserSubscription hook
 */
export interface UseUserSubscriptionOptions {
  /** Optional user ID. When provided, sets the subscription user and reloads on change. */
  userId?: string;
  /** Optional email for the user */
  userEmail?: string;
}

let refetchWarned = false;

/**
 * Hook to get current user's subscription status
 *
 * @param options Optional configuration including userId
 * @returns Current subscription data, loading state, and error
 *
 * @example
 * ```typescript
 * // Without user ID (anonymous or use existing)
 * const { subscription, isLoading } = useUserSubscription();
 *
 * // With user ID (will re-initialize when user changes)
 * const { subscription, isLoading } = useUserSubscription({
 *   userId: user?.uid,
 *   userEmail: user?.email,
 * });
 *
 * if (isLoading) return <Spinner />;
 *
 * if (subscription?.isActive) {
 *   return <div>Your plan: {subscription.entitlements.join(', ')}</div>;
 * } else {
 *   return <div>No active subscription</div>;
 * }
 * ```
 */
export function useUserSubscription(
  _options?: UseUserSubscriptionOptions
): UseUserSubscriptionResult {
  // Note: the current user comes from `@sudobility/di` (set by the app at its
  // auth boundary) and is synced to the store adapter by the subscription
  // singleton. `_options.userId`/`userEmail` are accepted for backwards
  // compatibility but no longer drive the user — di does.
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadIdRef = useRef(0);
  // The active subscription derives from the user through this: it loads only
  // for a user who can subscribe (on IAP any userId; on web a logged-in one).
  const subscribable = useIsUserSubscribable();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const currentLoadId = ++loadIdRef.current;

      if (!subscribable) {
        setSubscription(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (!isSubscriptionInitialized()) {
        setError(new Error('Subscription not initialized'));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const service = getSubscriptionInstance();
        await service.loadCustomerInfo();

        if (cancelled || currentLoadId !== loadIdRef.current) return;

        setSubscription(service.getCurrentSubscription());
      } catch (err) {
        if (!cancelled && currentLoadId === loadIdRef.current) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to load subscription')
          );
        }
      } finally {
        if (!cancelled && currentLoadId === loadIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void load();

    // Reload when the user changes (fired by the singleton after the adapter's
    // user has been synced) and on refresh events (e.g. after a purchase).
    const unsubscribeUserId = onSubscriptionUserIdChange(() => {
      void load();
    });
    const unsubscribeRefresh = onSubscriptionRefresh(() => {
      if (isSubscriptionInitialized()) {
        const service = getSubscriptionInstance();
        setSubscription(service.getCurrentSubscription());
      }
    });

    return () => {
      cancelled = true;
      unsubscribeUserId();
      unsubscribeRefresh();
    };
  }, [subscribable]);

  const update = useCallback(async () => {
    if (!isSubscriptionInitialized()) return;

    const service = getSubscriptionInstance();
    try {
      setIsLoading(true);
      setError(null);
      await service.loadCustomerInfo();
      const currentSub = service.getCurrentSubscription();
      setSubscription(currentSub);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load subscription')
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    subscription,
    isLoading,
    error,
    update,
    get refetch() {
      if (!refetchWarned) {
        console.warn(
          "useUserSubscription: 'refetch' is deprecated, use 'update' instead"
        );
        refetchWarned = true;
      }
      return update;
    },
  };
}
