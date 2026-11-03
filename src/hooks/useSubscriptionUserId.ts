/**
 * useSubscriptionUserId Hook
 *
 * The current subscription user id (the Firebase uid the app set via
 * `setSubscriptionUserId`), as reactive state — re-renders when it changes
 * (anonymous → real, sign-out, etc.). The root of the subscription hook chain:
 * `useIsUserSubscribable` and the offering/subscription hooks derive from it.
 */

import { useEffect, useState } from 'react';
import {
  getSubscriptionUserId,
  onSubscriptionUserIdChange,
} from '../core/singleton';

/** The current subscription user id, or undefined when none is set. */
export function useSubscriptionUserId(): string | undefined {
  const [userId, setUserId] = useState<string | undefined>(
    getSubscriptionUserId()
  );

  useEffect(() => {
    // Sync in case it changed between first render and effect, then subscribe.
    setUserId(getSubscriptionUserId());
    return onSubscriptionUserIdChange(() => {
      setUserId(getSubscriptionUserId());
    });
  }, []);

  return userId;
}
