/**
 * @fileoverview Level Calculator Utilities
 *
 * Calculate entitlement levels based on price comparison within the same period.
 * Used to determine upgrade eligibility by comparing package levels across
 * different subscription tiers.
 */

import type {
  PackageWithLevel,
  SubscriptionPackage,
} from '../types/subscription';
import { PERIOD_RANKS, type SubscriptionPeriod } from '@sudobility/types';

/**
 * Calculate entitlement levels for packages.
 *
 * Level is determined by comparing prices of packages with the same period.
 * Higher price = higher level. Free tier always has level 0.
 *
 * @param packages - List of packages to calculate levels for.
 * @returns Map of packageId to level number.
 *
 * @example
 * // Given packages:
 * // - free (no product)
 * // - basic_monthly ($5)
 * // - pro_monthly ($10)
 * // - basic_yearly ($50)
 * // - pro_yearly ($100)
 * //
 * // Returns:
 * // - free: 0
 * // - basic_monthly: 1
 * // - pro_monthly: 2
 * // - basic_yearly: 1
 * // - pro_yearly: 2
 */
export function calculatePackageLevels(
  packages: SubscriptionPackage[]
): Map<string, number> {
  const levels = new Map<string, number>();

  // Group packages by period
  const byPeriod = new Map<
    SubscriptionPeriod | 'free',
    SubscriptionPackage[]
  >();

  for (const pkg of packages) {
    if (!pkg.product) {
      // Free tier
      levels.set(pkg.packageId, 0);
      continue;
    }

    const period = pkg.product.period;
    const existing = byPeriod.get(period) ?? [];
    existing.push(pkg);
    byPeriod.set(period, existing);
  }

  // For each period, sort by price and assign levels
  for (const [_period, periodPackages] of byPeriod) {
    // Sort by price ascending
    const sorted = [...periodPackages].sort((a, b) => {
      const priceA = a.product?.price ?? 0;
      const priceB = b.product?.price ?? 0;
      return priceA - priceB;
    });

    // Assign levels (1, 2, 3, ...)
    // Same price = same level
    let currentLevel = 0;
    let lastPrice: number | null = null;

    for (const pkg of sorted) {
      const price = pkg.product?.price ?? 0;

      if (lastPrice === null || price > lastPrice) {
        currentLevel++;
        lastPrice = price;
      }

      levels.set(pkg.packageId, currentLevel);
    }
  }

  return levels;
}

/**
 * Add level information to packages.
 *
 * @param packages - List of subscription packages.
 * @returns New array of packages with an added `level` property.
 */
export function addLevelsToPackages(
  packages: SubscriptionPackage[]
): PackageWithLevel[] {
  const levels = calculatePackageLevels(packages);

  return packages.map(pkg => ({
    ...pkg,
    level: levels.get(pkg.packageId) ?? 0,
  }));
}

/**
 * Get the level of a specific package.
 *
 * @param packageId - Package ID to look up.
 * @param packages - All packages for context (needed to calculate relative levels).
 * @returns Level number (0 for free, higher = better).
 */
export function getPackageLevel(
  packageId: string,
  packages: SubscriptionPackage[]
): number {
  const levels = calculatePackageLevels(packages);
  return levels.get(packageId) ?? 0;
}

/**
 * Parameters for findUpgradeablePackages.
 */
export interface FindUpgradeableParams {
  /** Current package ID */
  packageId?: string | null;
  /** Current product ID (fallback if packageId not found) */
  productId?: string | null;
}

/**
 * Find packages that are upgrades from the current package.
 *
 * A package is an upgrade if:
 * - Its period is >= current period, AND
 * - Its level is >= current level (but not the exact same package)
 *
 * @param current - Current package/product identifiers, a string packageId, or null/undefined for no subscription.
 * @param packages - All available packages to evaluate.
 * @returns Array of package IDs that are valid upgrades.
 */
export function findUpgradeablePackages(
  current: string | FindUpgradeableParams | null | undefined,
  packages: SubscriptionPackage[]
): string[] {
  // Normalize parameters
  let currentPackageId: string | null | undefined;
  let currentProductId: string | null | undefined;

  if (typeof current === 'string') {
    currentPackageId = current;
  } else if (current) {
    currentPackageId = current.packageId;
    currentProductId = current.productId;
  }

  // No current subscription = all packages are subscribable
  if (!currentPackageId && !currentProductId) {
    return packages.map(p => p.packageId);
  }

  // Try to find by packageId first, then by productId
  let currentPkg = currentPackageId
    ? packages.find(p => p.packageId === currentPackageId)
    : undefined;

  if (!currentPkg && currentProductId) {
    currentPkg = packages.find(p => p.product?.productId === currentProductId);
  }

  if (!currentPkg) {
    // Current package not found, return all
    return packages.map(p => p.packageId);
  }

  // Use the matched package's ID (important when matched by productId)
  const matchedPackageId = currentPkg.packageId;

  // Free tier current = all paid packages are upgrades
  if (!currentPkg.product) {
    return packages.filter(p => p.product !== undefined).map(p => p.packageId);
  }

  const levels = calculatePackageLevels(packages);
  const currentLevel = levels.get(matchedPackageId) ?? 0;
  const currentPeriod = currentPkg.product.period;

  const upgrades: string[] = [];

  for (const pkg of packages) {
    // Skip free tier (can't upgrade to free)
    if (!pkg.product) continue;

    // Skip current package (by packageId)
    if (pkg.packageId === matchedPackageId) {
      continue;
    }

    const pkgLevel = levels.get(pkg.packageId) ?? 0;
    const pkgPeriod = pkg.product.period;

    // Must have >= period and >= level
    const isPeriodOk = PERIOD_RANKS[pkgPeriod] >= PERIOD_RANKS[currentPeriod];
    const isLevelOk = pkgLevel >= currentLevel;

    if (isPeriodOk && isLevelOk) {
      upgrades.push(pkg.packageId);
    }
  }

  return upgrades;
}
