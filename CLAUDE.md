# subscription_lib — AI Development Guide

> **Git policy — never auto-commit or auto-push.** Leave work in the working tree.
> Run `git commit`, `git push`, or `gh pr create` **only when the user explicitly
> asks in that turn**. Finishing a task is not permission to commit it.
> Do not use feature branches; stay on the current branch.

## What it is

Cross-platform subscription **business logic** for RevenueCat apps. Ships a
platform-agnostic `SubscriptionAdapter` seam, a service singleton, React hooks,
and a backend-API client. It contains **no platform SDK** — concrete RevenueCat
adapters are injected at init from the platform packages:

- Web → `@sudobility/subscription_pages` (`createRevenueCatAdapter`)
- RN  → `@sudobility/subscription_pages_rn` (`createRevenueCatRNAdapter`)

- Package `@sudobility/subscription_lib` · BUSL-1.1 · **ESM-only**
- Package manager **Bun**; published to **GitHub Packages** (`@sudobility` →
  `npm.pkg.github.com`, see `.npmrc`). CI uses `publish-target: github`.

## Commands (all verified)

```bash
bun run typecheck    # tsc --noEmit
bun run lint         # eslint src (flat config, eslint 10)
bun run test:unit    # vitest run  (NOT `bun test` — that runs Bun's own runner)
bun run test:watch   # vitest watch
bun run build        # tsc -> dist/, THEN node scripts/fix-esm-imports.mjs
bun run verify       # typecheck + lint + test:unit + build  (== prepublishOnly)
bun run format       # prettier --write
```

## Architecture

- `src/core/` — `service.ts` (`SubscriptionService`: loads/caches offerings &
  customer info, parses adapter DTOs → domain types) and `singleton.ts` (global
  instance + two listener lists: userId-change and refresh).
- `src/hooks/` — React hooks (see below). No React Context; hooks read the
  singleton directly.
- `src/backend/` — `fetchBackendSubscription` (plain fetch via a
  `NetworkClient`) + `useBackendSubscription` (React Query wrapper).
- `src/types/` — `adapter.ts` (`SubscriptionAdapter` + `Adapter*` DTOs) and
  `subscription.ts` (domain types).
- `src/utils/` — `period-parser.ts`, `level-calculator.ts`, `store-platform.ts`.
- `src/index.ts` — the only public surface (barrel). Concrete adapters are
  intentionally NOT exported.

### Current-user model (important, non-obvious)

The library does **not** own a user id. `initializeSubscription` subscribes to
`@sudobility/di`'s `UserProvider`; the app pushes the user with di's
`setCurrentUser` (`useSubscriptionAuth` does this). On change the singleton
syncs `adapter.setUserId`, clears the customer-info cache, and fires listeners.
There is **no** `setSubscriptionUserId` export (removed).

### Subscribability gate

`useIsUserSubscribable()` is the single source of truth for "can subscribe?" and
every offering/subscription hook derives from it — never gate on `userId`/login
directly. Rule: native IAP (`adapter.usesNativeIap`) needs any `userId`; web
billing needs `UserProvider.isLoggedIn()`.

### Hooks

- Active: `useSubscriptionAuth`, `useUserSubscription`, `useEntitlements`,
  `useSubscriptionUserId`, `useIsUserSubscribable`.
- Multi-offering: `useAllOfferings`, `useOfferingPackages`, `usePackagesByDuration`.
- Deprecated (kept for back-compat): `useSubscriptions`, `useSubscriptionPeriods`,
  `useSubscriptionForPeriod`, `useSubscribable`.

### Caching

Offerings are cached permanently (don't vary by user); a shared promise
dedupes concurrent loads. Customer info is cleared on user change and reloaded
on demand.

### Upgrade eligibility (`findUpgradeablePackages`)

No current sub → all packages. On free tier → all paid. Active sub → a package
qualifies when `periodRank >= currentPeriodRank` AND `level >= currentLevel`,
where level is the price rank within the same period (equal price = equal
level). Period ranks come from `@sudobility/types` `PERIOD_RANKS`.

### Period parsing

`service.parsePackage` prefers RevenueCat's `packageType` enum
(`packageTypeToPeriod`, e.g. `$rc_monthly`) and falls back to ISO-8601
(`parseISO8601Period`), because the web SDK's `normalPeriodDuration` is often
missing/wrong. Empty/null duration → `lifetime`; unrecognized → `monthly`.

## Conventions & gotchas

- **`FreeTierConfig` is `{ packageId, name }`** — not `displayName`.
- **ESM-only output**: `exports` exposes only `import` + `types`. After `tsc`,
  `scripts/fix-esm-imports.mjs` rewrites relative specifiers to explicit `.js`
  paths so Node's native ESM loader can resolve them (`./core` → `./core/index.js`).
  Build is broken without this post-step; run `bun run build`, not bare `tsc`.
- **Tests**: Vitest, no config file (conventions inferred). Place `*.test.ts`
  next to source. Test files are excluded from `tsc` and linted with relaxed rules.
- **TS config**: ES2020 / ESNext / `moduleResolution: bundler`, full strict +
  `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`. `_`-prefixed vars are
  allowed unused.
- **`@tanstack/react-query` is an optional peer** — only the backend hook needs
  it. `@sudobility/di` and `@sudobility/types` are required peers.

## Adding things

- **New hook**: create `src/hooks/useX.ts`, re-export from `src/hooks/index.ts`
  and `src/index.ts` (hook + its result/options types). Read the singleton via
  `getSubscriptionInstance()` / `isSubscriptionInitialized()`; gate on
  `useIsUserSubscribable()`.
- **New adapter DTO field**: update `src/types/adapter.ts`, then the mapping in
  `src/core/service.ts` (and the domain type in `subscription.ts` if it surfaces).
- **New period**: add it in `@sudobility/types` (`SubscriptionPeriod`,
  `PERIOD_RANKS`, `ALL_PERIODS`), then parsing + tests in
  `src/utils/period-parser.ts`.
