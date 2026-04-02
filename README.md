# Trip Planner

Trip Planner is a Next.js app for turning rough trip inputs into a structured itinerary workflow:

- parse draft stops from free text or imported files
- review and edit the draft
- optimize the schedule
- generate navigation links

## Runtime

This repo is verified on Node `25.8.2`.

- `.nvmrc` and `.node-version` are pinned to `25.8.2`
- `package.json` allows Node `>=22 <26`

If you use `nvm-windows`:

```powershell
nvm install 25.8.2
nvm use 25.8.2
```

## Why Node 25 Works Here

Node 25 support required more than bumping the engine range.

- Next.js was upgraded to `16.2.2`
- React and React DOM were upgraded to `19.2.4`
- linting was migrated from `next lint` to ESLint CLI because Next 16 removed `next lint`
- production builds run with `experimental.cpus = 1` and `experimental.workerThreads = true` in [next.config.ts](./next.config.ts)

That last point matters on Windows. In this environment, the default multi-process build pipeline kept failing with `spawn EPERM`. Forcing a single worker-thread based build path made `npm run build` reliable on Node 25.

## Scripts

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`typecheck` uses:

```powershell
next typegen && tsc --noEmit
```

This matches the current Next 16 route type generation flow.

## Verified State

The following commands pass on Node `25.8.2`:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Notes

- A local `.npm-cache/` directory may appear during installs in restricted Windows environments. It is ignored by Git.
- The project still supports Node 22 by engine range, but the pinned local development target is now Node 25.8.2 because that is the version validated in this worktree.
