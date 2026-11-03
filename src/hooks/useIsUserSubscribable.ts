/**
 * useIsUserSubscribable Hook
 *
 * Whether the current user can start a subscription purchase. The single source
 * of truth for the "can subscribe?" rule; every subscription UI and the
 * offering/active-subscription hooks gate on this, never on `userId` or
 * `isLoggedIn` directly.
 *
 * Fully derived (zero-arg), rooted at the Firebase userId:
 *
 *   Firebase userId → useIsUserSubscribable → offerings & active subscription
 *
 * - **Native IAP** (Apple / Google — the adapter's `usesNativeIap`): RevenueCat
 *   buys against the (possibly anonymous) app user, so a `userId` is enough.
 * - **Web billing**: the purchase needs a logged-in real account, i.e.
 *   `useIsLoggedIn()` (= a userId that is not anonymous).
 *
 * `useIsLoggedIn` comes from `@sudobility/auth_lib`; both the web and RN apps
 * provide its context via `createFirebaseAuthContext`.
 */

import { useIsLoggedIn } from '@sudobility/auth_lib/auth-js';
import { isSubscriptionNativeIap } from '../core/singleton';
import { useSubscriptionUserId } from './useSubscriptionUserId';

/** Returns whether the user can begin a subscription purchase. */
export function useIsUserSubscribable(): boolean {
  const userId = useSubscriptionUserId();
  const isLoggedIn = useIsLoggedIn();
  // Which store this platform bills through is fixed at init, so a plain read.
  const usesNativeIap = isSubscriptionNativeIap();
  return usesNativeIap ? !!userId : isLoggedIn;
}
