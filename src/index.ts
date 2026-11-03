/**
 * @sudobility/subscription_lib
 *
 * Cross-platform subscription management library with RevenueCat adapter pattern.
 * Works with both React (web) and React Native.
 */

// Core
export {
  initializeSubscription,
  getSubscriptionInstance,
  isSubscriptionInitialized,
  resetSubscription,
  refreshSubscription,
  restoreSubscription,
  setSubscriptionUserId,
  getSubscriptionUserId,
  isSubscriptionNativeIap,
  onSubscriptionUserIdChange,
  onSubscriptionRefresh,
  SubscriptionService,
  type SubscriptionConfig,
  type SubscriptionServiceConfig,
} from './core';

// Hooks (new multi-offering hooks)
export {
  useAllOfferings,
  useOfferingPackages,
  usePackagesByDuration,
  type UseAllOfferingsResult,
  type UseOfferingPackagesResult,
  type UsePackagesByDurationResult,
  type PackageWithOffer,
} from './hooks';

// Hooks (active)
export {
  useUserSubscription,
  useSubscriptionUserId,
  useIsUserSubscribable,
  useEntitlements,
  useSubscriptionAuth,
  type UseUserSubscriptionResult,
  type UseUserSubscriptionOptions,
  type UseEntitlementsResult,
  type UseSubscriptionAuthOptions,
  type UseSubscriptionAuthResult,
} from './hooks';

// Hooks (deprecated - kept for backwards compatibility)
export {
  useSubscriptions,
  useSubscriptionPeriods,
  useSubscriptionForPeriod,
  useSubscribable,
  type UseSubscriptionsResult,
  type UseSubscriptionsOptions,
  type UseSubscriptionPeriodsResult,
  type UseSubscriptionForPeriodResult,
  type UseSubscribableResult,
  type UseSubscribableOptions,
} from './hooks';

// Types
export type {
  // Adapter types
  SubscriptionAdapter,
  AdapterOfferings,
  AdapterOffering,
  AdapterPackage,
  AdapterProduct,
  AdapterSubscriptionOption,
  AdapterPricingPhase,
  AdapterCustomerInfo,
  AdapterEntitlementInfo,
  AdapterPurchaseParams,
  AdapterPurchaseResult,
  // Subscription types
  SubscriptionProduct,
  SubscriptionPackage,
  SubscriptionOffer,
  CurrentSubscription,
  FreeTierConfig,
  PackageWithLevel,
} from './types';

// Utils
export {
  parseISO8601Period,
  getPeriodRank,
  comparePeriods,
  isPeriodGreaterOrEqual,
  periodToMonths,
  calculatePackageLevels,
  addLevelsToPackages,
  getPackageLevel,
  findUpgradeablePackages,
} from './utils';

// Backend API client
export {
  fetchBackendSubscription,
  useBackendSubscription,
  type UseBackendSubscriptionOptions,
} from './backend';

// NOTE: Concrete RevenueCat adapters are intentionally NOT exported here.
// subscription_lib is platform-agnostic business logic and must not pull in a
// platform SDK (@revenuecat/purchases-js on web, react-native-purchases on RN).
// The agnostic seam is `initializeSubscription({ adapter })` + the
// `SubscriptionAdapter` interface above. Concrete adapters live in the platform
// UI packages and are injected through that seam:
//   - Web:          @sudobility/subscription_pages    (createRevenueCatAdapter)
//   - React Native: @sudobility/subscription_pages_rn (createRevenueCatRNAdapter)
