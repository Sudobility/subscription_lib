/**
 * useIsUserSubscribable Hook
 *
 * Whether the current user can start a subscription purchase. The single source
 * of truth for the "can subscribe?" rule; subscription UIs gate their options
 * on this, never on `userId` or `isLoggedIn` directly.
 *
 * Derived from the userId and whether the platform subscribes through native
 * in-app purchase (Apple / Google):
 * - Native IAP (iOS / Android / macOS): RevenueCat buys against the (possibly
 *   anonymous) app user, so only a `userId` is required — no sign-in.
 * - Web billing (web / Windows): the purchase needs a logged-in real account,
 *   so it is `isLoggedIn` (from auth_lib's `useIsLoggedIn`). An anonymous user
 *   has a userId but cannot purchase on web billing.
 */

import { SubscriptionPlatform } from '@sudobility/types';

export interface UseIsUserSubscribableOptions {
  /** The current user's id (anonymous or real); undefined when there is none. */
  userId: string | undefined;
  /** The platform whose billing this purchase would use. */
  currentPlatform: SubscriptionPlatform;
  /**
   * Whether the user is logged in (a real, non-anonymous account), e.g. from
   * auth_lib's `useIsLoggedIn`. Only consulted on web billing.
   */
  isLoggedIn: boolean;
}

/**
 * Returns whether the user can begin a subscription purchase on this platform.
 */
export function useIsUserSubscribable({
  userId,
  currentPlatform,
  isLoggedIn,
}: UseIsUserSubscribableOptions): boolean {
  const usesNativeIap = currentPlatform !== SubscriptionPlatform.Web;
  return usesNativeIap ? !!userId : isLoggedIn;
}
