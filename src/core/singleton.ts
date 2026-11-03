/**
 * Subscription Singleton
 *
 * Global singleton manager for the SubscriptionService.
 */

import { getUserProvider } from '@sudobility/di';
import type { SubscriptionAdapter } from '../types/adapter';
import type { FreeTierConfig } from '../types/subscription';
import { SubscriptionService } from './service';

/**
 * Configuration for initializing the subscription singleton
 */
export interface SubscriptionConfig {
  /** RevenueCat adapter implementation */
  adapter: SubscriptionAdapter;
  /** Free tier configuration */
  freeTier: FreeTierConfig;
}

let instance: SubscriptionService | null = null;
let currentAdapter: SubscriptionAdapter | null = null;
// The last user id we synced into the adapter, to skip redundant work.
let lastSyncedUserId: string | undefined = undefined;
let unsubscribeUser: (() => void) | null = null;
const userIdChangeListeners: Array<() => void> = [];
const subscriptionRefreshListeners: Array<() => void> = [];

/**
 * Sync the adapter's user from `@sudobility/di`'s UserProvider (the fleet's
 * current user). Runs on init and whenever the provider changes. Awaits the
 * adapter so customer-info reloads (triggered via the listeners below) see the
 * right RevenueCat user.
 */
async function syncUserFromProvider(): Promise<void> {
  const userId = getUserProvider().getUserId();
  if (userId === lastSyncedUserId) {
    return;
  }
  lastSyncedUserId = userId;
  if (currentAdapter?.setUserId) {
    await currentAdapter.setUserId(userId);
  }
  // Clear only customer info cache (preserve offerings), then notify.
  instance?.clearCustomerInfo();
  for (const listener of userIdChangeListeners) {
    listener();
  }
}

/**
 * Initialize the subscription singleton
 *
 * Call this once at app startup with your RevenueCat adapter.
 *
 * @param config Configuration with adapter and free tier info
 *
 * @example
 * ```typescript
 * import { initializeSubscription } from '@sudobility/subscription_lib';
 * // Concrete adapter comes from the platform package:
 * //   web -> @sudobility/subscription_pages, RN -> @sudobility/subscription_pages_rn
 * import { createRevenueCatAdapter } from '@sudobility/subscription_pages';
 *
 * initializeSubscription({
 *   adapter: createRevenueCatAdapter(),
 *   freeTier: { packageId: 'free', name: 'Free' }
 * });
 * ```
 */
export function initializeSubscription(config: SubscriptionConfig): void {
  currentAdapter = config.adapter;
  instance = new SubscriptionService({
    adapter: config.adapter,
    freeTier: config.freeTier,
  });
  // Drive the adapter's user from di's UserProvider. The app pushes the current
  // user (Firebase, wallet, …) via di `setCurrentUser`; we sync it to the
  // store adapter and reload customer info on change.
  lastSyncedUserId = undefined;
  unsubscribeUser?.();
  unsubscribeUser = getUserProvider().subscribe(() => {
    void syncUserFromProvider();
  });
  void syncUserFromProvider();
}

/**
 * Get the subscription service singleton
 *
 * @throws Error if not initialized
 */
export function getSubscriptionInstance(): SubscriptionService {
  if (!instance) {
    throw new Error(
      'Subscription not initialized. Call initializeSubscription() first.'
    );
  }
  return instance;
}

/**
 * Check if subscription singleton is initialized
 */
export function isSubscriptionInitialized(): boolean {
  return instance !== null;
}

/**
 * Whether the configured adapter bills through native in-app purchase (Apple /
 * Google) rather than web billing. Used by `useIsUserSubscribable`. False when
 * no adapter is configured or the adapter does not set the flag.
 */
export function isSubscriptionNativeIap(): boolean {
  return currentAdapter?.usesNativeIap ?? false;
}

/**
 * Reset the subscription singleton (mainly for testing)
 */
export function resetSubscription(): void {
  instance = null;
  unsubscribeUser?.();
  unsubscribeUser = null;
  lastSyncedUserId = undefined;
}

/**
 * Refresh subscription data (customer info and offerings)
 *
 * Call this after a purchase to ensure subscription state is up to date.
 *
 * @example
 * ```typescript
 * import { refreshSubscription } from '@sudobility/subscription_lib';
 *
 * // After purchase completes
 * await refreshSubscription();
 * ```
 */
export async function refreshSubscription(): Promise<void> {
  if (!instance) {
    return;
  }
  await Promise.all([instance.loadOfferings(), instance.loadCustomerInfo()]);

  // Notify listeners that subscription data has been refreshed
  for (const listener of subscriptionRefreshListeners) {
    listener();
  }
}

/**
 * Restore purchases from the App Store / Play Store.
 * Re-syncs with the store and updates subscription state.
 *
 * @returns Updated subscription state, or null if not initialized
 *
 * @example
 * ```typescript
 * import { restoreSubscription } from '@sudobility/subscription_lib';
 *
 * const result = await restoreSubscription();
 * if (result?.isActive) {
 *   // Purchases restored successfully
 * }
 * ```
 */
export async function restoreSubscription(): Promise<
  import('../types/subscription').CurrentSubscription | null
> {
  if (!instance) {
    return null;
  }
  const result = await instance.restorePurchases();

  // Notify listeners that subscription data has been refreshed
  for (const listener of subscriptionRefreshListeners) {
    listener();
  }

  return result;
}

/**
 * Get the current user ID (from `@sudobility/di`'s UserProvider). The app sets
 * the current user via di `setCurrentUser` at its auth boundary; subscription_lib
 * no longer owns a separate user id.
 */
export function getSubscriptionUserId(): string | undefined {
  return getUserProvider().getUserId();
}

/**
 * Subscribe to user ID changes
 * @param listener Callback to invoke when user ID changes
 * @returns Unsubscribe function
 */
export function onSubscriptionUserIdChange(listener: () => void): () => void {
  userIdChangeListeners.push(listener);
  return () => {
    const index = userIdChangeListeners.indexOf(listener);
    if (index >= 0) {
      userIdChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Subscribe to subscription data refresh events.
 * Called after refreshSubscription() completes.
 * @param listener Callback to invoke when subscription data is refreshed
 * @returns Unsubscribe function
 */
export function onSubscriptionRefresh(listener: () => void): () => void {
  subscriptionRefreshListeners.push(listener);
  return () => {
    const index = subscriptionRefreshListeners.indexOf(listener);
    if (index >= 0) {
      subscriptionRefreshListeners.splice(index, 1);
    }
  };
}
