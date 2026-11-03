/**
 * Core Exports
 */

export { SubscriptionService, type SubscriptionServiceConfig } from './service';

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
  type SubscriptionConfig,
} from './singleton';
