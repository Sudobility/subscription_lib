/**
 * useIsUserSubscribable Hook
 *
 * Whether the current user can start a subscription purchase. The single source
 * of truth for the "can subscribe?" rule; every subscription UI and the
 * offering/active-subscription hooks gate on this, never on `userId` or login
 * state directly.
 *
 * Fully derived (zero-arg), rooted at the current user:
 *
 *   di UserProvider (userId + isLoggedIn) → useIsUserSubscribable → offerings & active subscription
 *
 * - **Native IAP** (Apple / Google — the adapter's `usesNativeIap`): the store
 *   buys against the (possibly anonymous) app user, so a `userId` is enough.
 * - **Web billing**: the purchase needs a logged-in real account, i.e. the
 *   provider's `isLoggedIn()` (a userId that is not anonymous / a connected
 *   wallet / …).
 *
 * The current user comes from `@sudobility/di` so this works for any auth
 * system (Firebase, wallet, …) — subscription_lib does not depend on auth_lib.
 */

import { useEffect, useState } from 'react';
import { getUserProvider } from '@sudobility/di';
import { isSubscriptionNativeIap } from '../core/singleton';

/** Returns whether the user can begin a subscription purchase. */
export function useIsUserSubscribable(): boolean {
  const [state, setState] = useState<{
    userId: string | undefined;
    isLoggedIn: boolean;
  }>(() => {
    const p = getUserProvider();
    return { userId: p.getUserId(), isLoggedIn: p.isLoggedIn() };
  });

  useEffect(() => {
    const read = () => {
      const p = getUserProvider();
      setState({ userId: p.getUserId(), isLoggedIn: p.isLoggedIn() });
    };
    read();
    return getUserProvider().subscribe(read);
  }, []);

  // Which store this platform bills through is fixed at init, so a plain read.
  const usesNativeIap = isSubscriptionNativeIap();
  return usesNativeIap ? !!state.userId : state.isLoggedIn;
}
