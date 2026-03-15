# @victor-software-house/pi-multicodex roadmap

## Decisions locked in

- **Package name:** `@victor-software-house/pi-multicodex`
- **Command prefix:** keep current commands for now
  - `/multicodex-login`
  - `/multicodex-use`
  - `/multicodex-status`
- **Storage compatibility:** none
  - hard break
  - no migration
  - no import from previous storage
- **Scope:** Codex only
- **Replacement strategy:** hard break
  - no drop-in compatibility goal
  - no obligation to preserve older behavior

## Package manager policy

- Use **pnpm** for local development in this repo.
- Keep the published package **npm-installable** because pi package docs and examples are npm-first.
- Keep release validation with at least:
  - `npm pack --dry-run`
  - one clean npm install or consume check
- Do not rely on Bun as the consumer package manager for pi-managed installs.

## Architecture summary

### Why the extension manages its own account pool

Pi OAuth storage is keyed by provider ID and is naturally shaped around a single credential set per provider. That model works for standard providers, but it does not naturally represent:

- multiple OAuth accounts under one provider
- account pools
- account rotation state
- per-account exhaustion windows

Because of that, this extension keeps its own multi-account storage and selection logic.

### What pi supports well

- override an existing provider's `baseUrl` or `headers`
- register a new provider with `oauth` so it appears in `/login`
- replace provider behavior through `pi.registerProvider(name, config)`

### What still needs custom logic here

- multi-account persistence
- account rotation decisions
- manual account selection
- quota exhaustion tracking
- cache refresh policy

## UX direction

Near-term direction:

- keep custom multi-account storage
- keep explicit management commands
- improve dialogs and command flow over time

Possible future enhancement:

- add optional `/login` integration through a dedicated provider while still keeping account-pool state extension-managed

## Milestones

## Milestone 1 — package baseline

Goal: keep the package self-contained and maintainable.

- [x] Rename package to `@victor-software-house/pi-multicodex`
- [x] Update repository metadata and package identity
- [x] Rewrite README as first-party project documentation
- [x] Adopt pnpm in the repo
- [x] Keep package output npm-compatible
- [x] Add `packageManager` field to `package.json`
- [x] Keep `npm pack --dry-run` as a release gate
- [x] Fix lint failures and config drift
- [x] Remove unnecessary local type shim

## Milestone 2 — storage break

Goal: remove inherited persistence baggage.

- [ ] Replace `~/.pi/agent/multicodex.json` with a new path
- [ ] Redesign storage schema without backward compatibility
- [ ] Remove all migration and import concerns
- [ ] Document the storage break in release notes

Suggested naming:
- [ ] choose one stable new storage file path
  - `~/.pi/agent/victor-pi-multicodex.json`
  - `~/.pi/agent/pi-multicodex.victor.json`

## Milestone 3 — module refactor

Goal: break up the monolithic `index.ts`.

Target structure:

- [ ] `src/index.ts` or thin root `index.ts`
- [ ] `src/storage.ts`
- [ ] `src/accounts.ts`
- [ ] `src/usage.ts`
- [ ] `src/selection.ts`
- [ ] `src/provider.ts`
- [ ] `src/commands.ts`
- [ ] `src/oauth.ts`
- [ ] `src/errors.ts`

Tests:
- [ ] `selection.test.ts`
- [ ] `usage.test.ts`
- [ ] `storage.test.ts`
- [ ] `provider.test.ts`

## Milestone 4 — behavior contract

Goal: define the package behavior explicitly.

- [ ] Define account selection strategy
- [ ] Define quota exhaustion semantics
- [ ] Define which windows matter for selection
- [ ] Define retry policy
- [ ] Define manual override behavior
- [ ] Define when manual override clears
- [ ] Define cache TTL and refresh rules
- [ ] Define error classification rules
- [ ] Document all of the above in README

## Milestone 5 — UX improvements

Goal: improve usability without pretending this is a single-account provider.

- [ ] Review whether commands should stay unchanged or gain a top-level management command
- [ ] Improve account picker and status dialogs
- [ ] Decide whether `/multicodex-login` remains argument-based or becomes interactive
- [ ] Decide whether to add optional `/login` integration through a dedicated provider later
- [ ] Keep multi-account state extension-managed regardless of `/login` integration

## Milestone 6 — release discipline

Goal: keep releases repeatable and easy to validate.

- [x] Ensure package name is `@victor-software-house/pi-multicodex`
- [x] Ensure tarball contents are minimal
- [x] Run lint, typecheck, tests
- [x] Run `npm pack --dry-run`
- [x] Publish to npmjs
- [x] Configure trusted publishing
- [ ] Test install via local path in pi
- [ ] Test install from published package in pi
- [ ] Add release notes for future versions

## Non-goals

- [ ] No backward compatibility with previous storage
- [ ] No cross-provider account orchestration
- [ ] No obligation to preserve older behavior where it conflicts with the current design
- [ ] No Bun-first consumer install story
