/**
 * useAllOfferings Hook
 *
 * Fetch all subscription offerings sorted by identifier.
 * Offerings (product catalog) don't change with user,
 * so this hook doesn't reload when user changes.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SubscriptionOffer } from '../types/subscription';
import {
  getSubscriptionInstance,
  isSubscriptionInitialized,
} from '../core/singleton';
import { useIsUserSubscribable } from './useIsUserSubscribable';

/**
 * Result of useAllOfferings hook
 */
export interface UseAllOfferingsResult {
  /** All offerings sorted by identifier, empty if loading */
  offerings: SubscriptionOffer[];
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Manually refetch the data */
  refetch: () => Promise<void>;
}

/**
 * Hook to get all subscription offerings sorted by identifier.
 * Offerings don't change with user, so this hook loads once.
 *
 * @returns All offerings, loading state, and error
 *
 * @example
 * ```typescript
 * const { offerings, isLoading, error } = useAllOfferings();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <div>
 *     {offerings.map(offer => (
 *       <OfferCard key={offer.offerId} offer={offer} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useAllOfferings(): UseAllOfferingsResult {
  const [offerings, setOfferings] = useState<SubscriptionOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Offerings derive from the userId through this: only a user who can
  // subscribe loads them (on IAP that is any userId; on web, a logged-in one).
  const subscribable = useIsUserSubscribable();

  const loadData = useCallback(async () => {
    if (!subscribable) {
      setOfferings([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isSubscriptionInitialized()) {
      setError(new Error('Subscription not initialized'));
      setIsLoading(false);
      return;
    }

    const service = getSubscriptionInstance();

    // If already loaded, use cached data
    if (service.hasLoadedOfferings()) {
      setOfferings(service.getAllOffers());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await service.loadOfferings();
      setOfferings(service.getAllOffers());
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load offerings')
      );
    } finally {
      setIsLoading(false);
    }
  }, [subscribable]);

  // Load when mounted and whenever subscribability changes (e.g. the userId
  // arrives, or the user signs in/out).
  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(async () => {
    if (!subscribable || !isSubscriptionInitialized()) return;

    const service = getSubscriptionInstance();
    try {
      setIsLoading(true);
      setError(null);
      await service.loadOfferings();
      setOfferings(service.getAllOffers());
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load offerings')
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { offerings, isLoading, error, refetch };
}
