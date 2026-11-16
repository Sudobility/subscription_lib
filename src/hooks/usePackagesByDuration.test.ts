/**
 * Tests for the grouping logic used by usePackagesByDuration.
 * Tests the pure data transformation without React hook rendering.
 */

import { describe, expect, it } from 'vitest';
import type { SubscriptionOffer } from '../types/subscription';
import { ALL_PERIODS, type SubscriptionPeriod } from '@sudobility/types';
import type { PackageWithOffer } from './usePackagesByDuration';

/**
 * Extract the pure grouping logic for testing.
 * This mirrors the useMemo logic in usePackagesByDuration.
 */
function groupPackagesByDuration(offerings: SubscriptionOffer[]) {
  const grouped: Partial<Record<SubscriptionPeriod, PackageWithOffer[]>> = {};

  for (const offer of offerings) {
    for (const pkg of offer.packages) {
      if (!pkg.product) continue;

      const period = pkg.product.period;
      if (!grouped[period]) {
        grouped[period] = [];
      }
      grouped[period]!.push({
        package: pkg,
        offerId: offer.offerId,
        offerMetadata: offer.metadata,
      });
    }
  }

  for (const period of Object.keys(grouped) as SubscriptionPeriod[]) {
    grouped[period]!.sort((a, b) => a.offerId.localeCompare(b.offerId));
  }

  const availableDurations = ALL_PERIODS.filter(
    p => grouped[p] && grouped[p]!.length > 0
  );

  return { packagesByDuration: grouped, availableDurations };
}

describe('groupPackagesByDuration', () => {
  it('returns empty for no offerings', () => {
    const result = groupPackagesByDuration([]);
    expect(result.packagesByDuration).toEqual({});
    expect(result.availableDurations).toEqual([]);
  });

  it('groups packages from multiple offerings by period', () => {
    const offerings: SubscriptionOffer[] = [
      {
        offerId: 'pro',
        packages: [
          {
            packageId: 'pro_monthly',
            name: 'Pro Monthly',
            product: {
              productId: 'pro_m',
              name: 'Pro Monthly',
              price: 9.99,
              priceString: '$9.99',
              currency: 'USD',
              period: 'monthly',
              periodDuration: 'P1M',
            },
            entitlements: ['pro'],
          },
          {
            packageId: 'pro_yearly',
            name: 'Pro Yearly',
            product: {
              productId: 'pro_y',
              name: 'Pro Yearly',
              price: 99.99,
              priceString: '$99.99',
              currency: 'USD',
              period: 'yearly',
              periodDuration: 'P1Y',
            },
            entitlements: ['pro'],
          },
        ],
      },
      {
        offerId: 'basic',
        packages: [
          {
            packageId: 'basic_monthly',
            name: 'Basic Monthly',
            product: {
              productId: 'basic_m',
              name: 'Basic Monthly',
              price: 4.99,
              priceString: '$4.99',
              currency: 'USD',
              period: 'monthly',
              periodDuration: 'P1M',
            },
            entitlements: ['basic'],
          },
          {
            packageId: 'basic_yearly',
            name: 'Basic Yearly',
            product: {
              productId: 'basic_y',
              name: 'Basic Yearly',
              price: 49.99,
              priceString: '$49.99',
              currency: 'USD',
              period: 'yearly',
              periodDuration: 'P1Y',
            },
            entitlements: ['basic'],
          },
        ],
      },
    ];

    const result = groupPackagesByDuration(offerings);

    // Should have monthly and yearly groups
    expect(result.availableDurations).toEqual(['monthly', 'yearly']);

    // Monthly group should have basic first (sorted by offerId), then pro
    const monthly = result.packagesByDuration.monthly!;
    expect(monthly).toHaveLength(2);
    expect(monthly[0].offerId).toBe('basic');
    expect(monthly[0].package.packageId).toBe('basic_monthly');
    expect(monthly[1].offerId).toBe('pro');
    expect(monthly[1].package.packageId).toBe('pro_monthly');

    // Yearly group should have basic first, then pro
    const yearly = result.packagesByDuration.yearly!;
    expect(yearly).toHaveLength(2);
    expect(yearly[0].offerId).toBe('basic');
    expect(yearly[1].offerId).toBe('pro');
  });

  it('sorts available durations in standard period order', () => {
    const offerings: SubscriptionOffer[] = [
      {
        offerId: 'test',
        packages: [
          {
            packageId: 'yearly',
            name: 'Yearly',
            product: {
              productId: 'y',
              name: 'Yearly',
              price: 99,
              priceString: '$99',
              currency: 'USD',
              period: 'yearly',
              periodDuration: 'P1Y',
            },
            entitlements: [],
          },
          {
            packageId: 'weekly',
            name: 'Weekly',
            product: {
              productId: 'w',
              name: 'Weekly',
              price: 2,
              priceString: '$2',
              currency: 'USD',
              period: 'weekly',
              periodDuration: 'P1W',
            },
            entitlements: [],
          },
          {
            packageId: 'monthly',
            name: 'Monthly',
            product: {
              productId: 'm',
              name: 'Monthly',
              price: 9,
              priceString: '$9',
              currency: 'USD',
              period: 'monthly',
              periodDuration: 'P1M',
            },
            entitlements: [],
          },
        ],
      },
    ];

    const result = groupPackagesByDuration(offerings);

    // Should be ordered: weekly, monthly, yearly (standard period order)
    expect(result.availableDurations).toEqual(['weekly', 'monthly', 'yearly']);
  });

  it('skips packages without products', () => {
    const offerings: SubscriptionOffer[] = [
      {
        offerId: 'test',
        packages: [
          {
            packageId: 'free',
            name: 'Free',
            product: undefined,
            entitlements: [],
          },
          {
            packageId: 'paid_monthly',
            name: 'Paid Monthly',
            product: {
              productId: 'pm',
              name: 'Paid Monthly',
              price: 9.99,
              priceString: '$9.99',
              currency: 'USD',
              period: 'monthly',
              periodDuration: 'P1M',
            },
            entitlements: [],
          },
        ],
      },
    ];

    const result = groupPackagesByDuration(offerings);

    expect(result.availableDurations).toEqual(['monthly']);
    expect(result.packagesByDuration.monthly).toHaveLength(1);
  });

  it('carries offer metadata', () => {
    const offerings: SubscriptionOffer[] = [
      {
        offerId: 'premium',
        metadata: { entitlement: 'premium_access', tier: 2 },
        packages: [
          {
            packageId: 'premium_monthly',
            name: 'Premium Monthly',
            product: {
              productId: 'pm',
              name: 'Premium Monthly',
              price: 19.99,
              priceString: '$19.99',
              currency: 'USD',
              period: 'monthly',
              periodDuration: 'P1M',
            },
            entitlements: ['premium_access'],
          },
        ],
      },
    ];

    const result = groupPackagesByDuration(offerings);

    const monthly = result.packagesByDuration.monthly!;
    expect(monthly[0].offerMetadata).toEqual({
      entitlement: 'premium_access',
      tier: 2,
    });
  });
});
