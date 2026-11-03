/**
 * Hook Exports
 */

// New multi-offering hooks
export { useAllOfferings, type UseAllOfferingsResult } from './useAllOfferings';

export {
  useOfferingPackages,
  type UseOfferingPackagesResult,
} from './useOfferingPackages';

export {
  usePackagesByDuration,
  type PackageWithOffer,
  type UsePackagesByDurationResult,
} from './usePackagesByDuration';

// Active hooks
export {
  useUserSubscription,
  type UseUserSubscriptionResult,
  type UseUserSubscriptionOptions,
} from './useUserSubscription';

export { useEntitlements, type UseEntitlementsResult } from './useEntitlements';

export { useSubscriptionUserId } from './useSubscriptionUserId';

export { useIsUserSubscribable } from './useIsUserSubscribable';

export {
  useSubscriptionAuth,
  type UseSubscriptionAuthOptions,
  type UseSubscriptionAuthResult,
} from './useSubscriptionAuth';

// Deprecated hooks (kept for backwards compatibility)
export {
  useSubscriptions,
  type UseSubscriptionsResult,
  type UseSubscriptionsOptions,
} from './useSubscriptions';

export {
  useSubscriptionPeriods,
  type UseSubscriptionPeriodsResult,
} from './useSubscriptionPeriods';

export {
  useSubscriptionForPeriod,
  type UseSubscriptionForPeriodResult,
} from './useSubscriptionForPeriod';

export {
  useSubscribable,
  type UseSubscribableResult,
  type UseSubscribableOptions,
} from './useSubscribable';
