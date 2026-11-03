/**
 * useSubscriptionUserId Hook
 *
 * The current user id, read from `@sudobility/di`'s `UserProvider` (the fleet's
 * platform-agnostic current user — Firebase uid, wallet address, …), as
 * reactive state. The root of the subscription hook chain.
 */

import { useEffect, useState } from 'react';
import { getUserProvider } from '@sudobility/di';

/** The current subscription user id, or undefined when none is set. */
export function useSubscriptionUserId(): string | undefined {
  const [userId, setUserId] = useState<string | undefined>(() =>
    getUserProvider().getUserId()
  );

  useEffect(() => {
    const read = () => setUserId(getUserProvider().getUserId());
    read();
    return getUserProvider().subscribe(read);
  }, []);

  return userId;
}
