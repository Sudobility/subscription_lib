# @sudobility/subscription_lib

Cross-platform subscription **business logic** for RevenueCat-backed apps. It
provides a platform-agnostic `SubscriptionAdapter` seam, a global service
singleton, React hooks for offerings / entitlements / purchase eligibility, and
a small backend-API client.

The package deliberately contains **no platform SDK**. Concrete RevenueCat
adapters (web `@revenuecat/purchases-js`, RN `react-native-purchases`) live in
the platform UI packages and are injected at init:

- Web: `@sudobility/subscription_pages` (`createRevenueCatAdapter`)
- React Native: `@sudobility/subscription_pages_rn` (`createRevenueCatRNAdapter`)

The current user is read from `@sudobility/di`'s `UserProvider`, so this library
works with any auth system (Firebase, wallet, …) and never depends on an auth
library directly.

- **Package**: `@sudobility/subscription_lib` (v0.0.65)
- **License**: BUSL-1.1
- **Registry**: GitHub Packages (`@sudobility` scope → `npm.pkg.github.com`)
- **Module format**: ESM only

## Installation

The `@sudobility` scope resolves to GitHub Packages. Ensure your project's
`.npmrc` contains:

```
@sudobility:registry=https://npm.pkg.github.com
```

Then:

```bash
bun add @sudobility/subscription_lib
```

### Peer dependencies

| Package | Version | Required |
|---|---|---|
| `react` | `^18 \|\| ^19` | Yes |
| `@sudobility/di` | `^1.5.85` | Yes (current-user provider) |
| `@sudobility/types` | `^1.9.78` | Yes (`SubscriptionPeriod`, `NetworkClient`, …) |
| `@tanstack/react-query` | `^5` | Optional (only for the backend hook) |

## Usage

```typescript
import { initializeSubscription } from '@sudobility/subscription_lib';
// Concrete adapter comes from the platform package (NOT from this lib):
import { createRevenueCatAdapter } from '@sudobility/subscription_pages';

// App startup — call once.
initializeSubscription({
  adapter: createRevenueCatAdapter(),
  freeTier: { packageId: 'free', name: 'Free' }, // FreeTierConfig: { packageId, name }
});
```

Keep the subscription user in sync with your auth state at the app root:

```tsx
import { useSubscriptionAuth } from '@sudobility/subscription_lib';

function SubscriptionInitializer({ children }) {
  const { user, loading } = useAuthStatus(); // your auth hook
  const { isReady, entitlements } = useSubscriptionAuth({
    userId: !loading && user && !user.isAnonymous ? user.uid : undefined,
    userEmail: user?.email ?? undefined,
    isAuthLoading: loading,
  });
  // ...
}
```

Consume subscription data in components:

```tsx
import {
  useAllOfferings,
  usePackagesByDuration,
  useUserSubscription,
  useEntitlements,
} from '@sudobility/subscription_lib';

const { offerings, isLoading } = useAllOfferings();
const { packagesByDuration, availableDurations } = usePackagesByDuration();
const { subscription } = useUserSubscription();
const { entitlements } = useEntitlements();
```

## API

### Core (service singleton)

| Function | Description |
|----------|-------------|
| `initializeSubscription(config)` | Initialize once with `{ adapter, freeTier }`. Subscribes to `@sudobility/di` and syncs the current user into the adapter. |
| `getSubscriptionInstance()` | Get the `SubscriptionService` singleton (throws if not initialized). |
| `isSubscriptionInitialized()` | Whether `initializeSubscription` has run. |
| `isSubscriptionNativeIap()` | Whether the adapter bills via native IAP (`adapter.usesNativeIap`). |
| `refreshSubscription()` | Reload offerings + customer info; notify refresh listeners. Call after a purchase. |
| `restoreSubscription()` | Restore purchases from the store; returns the updated `CurrentSubscription \| null`. |
| `resetSubscription()` | Tear down the singleton (mainly for tests). |
| `getSubscriptionUserId()` | Current user id (from `@sudobility/di`). |
| `onSubscriptionUserIdChange(fn)` / `onSubscriptionRefresh(fn)` | Event subscriptions; return an unsubscribe function. |
| `SubscriptionService` | The service class (exported for advanced/custom use). |

### Hooks

**Active**

| Hook | Description |
|------|-------------|
| `useSubscriptionAuth({ userId, userEmail?, isAuthLoading })` | Pushes auth state into `@sudobility/di` and loads customer info. Returns `{ isReady, entitlements }`. Call once at app root. |
| `useUserSubscription()` | Current subscription status: `{ subscription, isLoading, error, update }` (`refetch` is a deprecated alias of `update`). |
| `useEntitlements()` | Active entitlement IDs: `{ entitlements, isLoading }`. |
| `useSubscriptionUserId()` | Reactive current user id from `@sudobility/di`. |
| `useIsUserSubscribable()` | `boolean` — can the user start a purchase? (native IAP needs a userId; web needs a logged-in account). The gate every other hook derives from. |

**Multi-offering**

| Hook | Description |
|------|-------------|
| `useAllOfferings()` | All offerings sorted by id: `{ offerings, isLoading, error, refetch }`. |
| `useOfferingPackages(offerId, offerings?)` | Packages for one offering, sorted by period: `{ packages, isLoading, error }`. |
| `usePackagesByDuration()` | Packages across all offerings grouped by billing period: `{ packagesByDuration, availableDurations, isLoading, error, refetch }`. |

**Deprecated** (kept for backwards compatibility — prefer the ones above):
`useSubscriptions`, `useSubscriptionPeriods`, `useSubscriptionForPeriod`,
`useSubscribable`.

### Backend API client

| Export | Description |
|--------|-------------|
| `fetchBackendSubscription(networkClient, baseUrl, token, userId, testMode?, nativeIap?)` | GET `/api/v1/users/:id/subscriptions`; returns a `BackendSubscriptionResult`. |
| `useBackendSubscription(networkClient, baseUrl, token, userId, options?)` | React Query wrapper (requires `@tanstack/react-query`). 2-minute `staleTime`; enabled only with `userId` + `token`. |

### Utilities

`parseISO8601Period`, `packageTypeToPeriod`, `getPeriodRank`, `comparePeriods`,
`isPeriodGreaterOrEqual`, `periodToMonths`, `calculatePackageLevels`,
`addLevelsToPackages`, `getPackageLevel`, `findUpgradeablePackages`,
`mapStoreToPlatform`.

### Key types

`SubscriptionAdapter`, `AdapterOfferings`, `AdapterOffering`, `AdapterPackage`,
`AdapterProduct`, `AdapterCustomerInfo`, `AdapterEntitlementInfo`,
`AdapterPurchaseParams`, `AdapterPurchaseResult`, `SubscriptionOffer`,
`SubscriptionPackage`, `SubscriptionProduct`, `CurrentSubscription`,
`FreeTierConfig`, `PackageWithLevel`, `SubscriptionConfig`,
`SubscriptionServiceConfig`. `SubscriptionPeriod` / `PERIOD_RANKS` /
`ALL_PERIODS` come from `@sudobility/types`.

## Development

```bash
bun run build          # tsc -> dist/, then scripts/fix-esm-imports.mjs
bun run dev            # tsc --watch
bun run clean          # rm -rf dist
bun run typecheck      # tsc --noEmit
bun run lint           # eslint src
bun run lint:fix       # eslint src --fix
bun run format         # prettier --write
bun run test:unit      # vitest run
bun run test:watch     # vitest (watch)
bun run verify         # typecheck + lint + test:unit + build
```

> Use `bun run test:unit`, **not** `bun test` — the latter invokes Bun's own
> test runner instead of Vitest.

Pre-publish gate (`prepublishOnly`) runs `bun run verify`.

## License

BUSL-1.1
