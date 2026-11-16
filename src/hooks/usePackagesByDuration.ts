/**
 * usePackagesByDuration Hook
 *
 * Group packages from all offerings by duration (billing period).
 * Each entry carries its parent offerId, needed for purchase().
 */

import { useMemo } from 'react';
import { ALL_PERIODS, type SubscriptionPeriod } from '@sudobility/types';
import type { SubscriptionPackage } from '../types/subscription';
import { useAllOfferings } from './useAllOfferings';

/**
 * A package with its parent offer context.
 * Needed because purchase() requires both packageId and offeringId.
 */
export interface PackageWithOffer {
  /** The subscription package */
  package: SubscriptionPackage;
  /** The offer this package belongs to */
  offerId: string;
  /** The offer metadata */
  offerMetadata?: Record<string, unknown>;
}

/**
 * Result of usePackagesByDuration hook
 */
export interface UsePackagesByDurationResult {
  /** Packages grouped by duration, within each group sorted by offer identifier */
  packagesByDuration: Partial<Record<SubscriptionPeriod, PackageWithOffer[]>>;
  /** Available durations sorted short-to-long */
  availableDurations: SubscriptionPeriod[];
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Manually refetch the data */
  refetch: () => Promise<void>;
}

/**
 * Hook to get packages from all offerings grouped by billing period.
 *
 * For example, if offer1 has monthly+yearly and offer2 has monthly+yearly,
 * the result will be:
 * - monthly: [offer1_monthly, offer2_monthly]
 * - yearly: [offer1_yearly, offer2_yearly]
 *
 * @returns Packages grouped by duration, available durations, loading state, and error
 *
 * @example
 * ```typescript
 * const { packagesByDuration, availableDurations, isLoading } = usePackagesByDuration();
 *
 * return (
 *   <>
 *     <SegmentedControl
 *       options={availableDurations.map(d => ({ value: d, label: d }))}
 *       value={selectedDuration}
 *       onChange={setSelectedDuration}
 *     />
 *     {packagesByDuration[selectedDuration]?.map(({ package: pkg, offerId }) => (
 *       <SubscriptionTile key={`${offerId}-${pkg.packageId}`} package={pkg} />
 *     ))}
 *   </>
 * );
 * ```
 */
export function usePackagesByDuration(): UsePackagesByDurationResult {
  const { offerings, isLoading, error, refetch } = useAllOfferings();

  const { packagesByDuration, availableDurations } = useMemo(() => {
    const grouped: Partial<Record<SubscriptionPeriod, PackageWithOffer[]>> = {};

    for (const offer of offerings) {
      for (const pkg of offer.packages) {
        if (!pkg.product) continue;

        const period = pkg.product.period;
        if (!grouped[period]) {
          grouped[period] = [];
        }
        grouped[period]?.push({
          package: pkg,
          offerId: offer.offerId,
          offerMetadata: offer.metadata,
        });
      }
    }

    // Sort within each group by offer identifier
    for (const period of Object.keys(grouped) as SubscriptionPeriod[]) {
      grouped[period]?.sort((a, b) => a.offerId.localeCompare(b.offerId));
    }

    // Available durations sorted by the standard period order
    const durations = ALL_PERIODS.filter(
      p => grouped[p] && (grouped[p]?.length ?? 0) > 0
    );

    return { packagesByDuration: grouped, availableDurations: durations };
  }, [offerings]);

  return { packagesByDuration, availableDurations, isLoading, error, refetch };
}
