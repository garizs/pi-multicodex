# @victor-software-house/pi-multicodex roadmap

## Product focus

`@victor-software-house/pi-multicodex` is a pi extension focused on rotating multiple ChatGPT Codex OAuth accounts for the `openai-codex-responses` API.

The roadmap is centered on:

- stable account management
- clear release and install paths
- maintainable internal structure
- better usage visibility for the active account
- a cleaner user experience inside pi

## Operating principles

- Keep npmjs as the canonical public distribution channel.
- Keep the package npm-installable for pi users.
- Use pnpm for local development.
- Keep releases small, validated, and repeatable.
- Prefer explicit behavior over hidden heuristics.
- Avoid custom encryption schemes for local secrets.
- If secret storage needs stronger protection later, prefer platform-backed secure storage over homegrown crypto.

## Decisions already locked in

- **Package name:** `@victor-software-house/pi-multicodex`
- **Commands:** use `/multicodex-use [identifier]` as the account command
  - `/multicodex-status`
  - `/multicodex-footer`
- **Scope:** Codex only
- **Local package manager:** pnpm
- **Primary release path:** npmjs with trusted publishing
- **Current storage filename:** `codex-accounts.json`
- **Local state path:** `~/.pi/agent/codex-accounts.json`
- **Provider strategy:** own the normal `openai-codex` path directly
- **Auth strategy:** auto-import pi's stored `openai-codex` auth when it is new or changed

## Release discipline

Every release should continue to pass at least:

```bash
pnpm check
npm pack --dry-run
```

Target release flow:

1. Prepare the release locally with `npm run release:prepare -- <version>`.
2. Commit the prepared version bump.
3. Create and push a matching `v*` tag.
4. Let GitHub Actions publish through trusted publishing.

## Current milestone — active-account usage visibility polish

Goal: finish the Codex footer so it feels like the built-in usage experience rather than an add-on.

Remaining work:

- [ ] Integrate the last layout and refresh ideas from `calesennett/pi-codex-usage`
- [ ] Debounce model-change refresh work so rapid `Ctrl+P` cycling never blocks on auth sync or usage fetches
- [ ] Render each reset countdown next to its matching usage period
- [ ] Add live preview inside the `/multicodex-footer` panel
- [ ] Update the actual footer while footer settings change in the panel
- [ ] Tune the footer color palette before locking the final style
- [ ] Tighten footer updates so account switches and quota rotation are reflected immediately
- [ ] Add tests for live preview updates, model-switch debouncing, and footer/account synchronization

## Follow-up milestone — behavior contract

Goal: make account rotation behavior explicit and documented.

- [ ] Define account selection priority
- [ ] Define quota exhaustion semantics
- [ ] Define which reset windows matter for selection
- [ ] Define retry policy
- [ ] Define manual override behavior
- [ ] Define when manual override clears
- [ ] Define cache TTL and refresh rules
- [ ] Define error classification rules
- [ ] Document the behavior contract in README or a dedicated doc

## Follow-up milestone — UX improvements

Goal: improve everyday usability for multi-account management.

- [ ] Improve the `/multicodex-use` account picker and select-or-login flow
- [ ] Improve the status output for account state, cooldowns, and manual selection
- [ ] Make active-account information easier to understand during a session

## Final release validation

Before the next real release, explicitly validate the full release path:

- [ ] Run `pnpm check`
- [ ] Run `npm pack --dry-run`
- [ ] Create and push the release tag
- [ ] Verify the GitHub Actions trusted-publishing workflow completes successfully
- [ ] Verify the new version is available on npmjs
- [ ] Verify install or upgrade in pi from the published package
- [ ] Verify the published tarball includes every runtime TypeScript module the extension imports

## Non-goals for now

- [ ] No cross-provider account orchestration
- [ ] No attempt to become a generic auth manager for pi
- [ ] No custom encryption implementation for local secrets
- [ ] No Bun-first consumer install story
