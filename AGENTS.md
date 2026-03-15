# MultiCodex Extension - Agent Notes

## Scope

Only edit files in this repository.

## Current architecture

The current codebase is organized around these responsibilities:

- `provider.ts`
  - overrides the normal `openai-codex` provider path
  - mirrors Codex models and installs the managed stream wrapper
- `stream-wrapper.ts`
  - account selection, retry, and quota-rotation path during streaming
- `account-manager.ts`
  - managed account storage, token refresh, usage cache, activation logic, auth import sync
- `auth.ts`
  - reads pi's `~/.pi/agent/auth.json` and extracts importable `openai-codex` OAuth state
- `status.ts`
  - footer rendering, footer settings persistence, footer settings panel, and footer refresh behavior
- `commands.ts`
  - current slash command registrations and account-selection flows
- `hooks.ts`
  - session-start and session-switch refresh behavior
- `storage.ts`
  - persisted account state in `~/.pi/agent/codex-accounts.json`

## Current product behavior

- MultiCodex owns the normal `openai-codex` provider path directly.
- pi's stored `openai-codex` auth is auto-imported when new or changed.
- Current shipped commands are:
  - `/multicodex-use [identifier]`
  - `/multicodex-status`
  - `/multicodex-footer`
- Footer settings are persisted in `~/.pi/agent/settings.json` under `pi-multicodex`.
- Rotation criteria are still hard-coded.

## Active roadmap priorities

When continuing work, prioritize these items before expanding scope:

1. Replace the three top-level commands with one `/multicodex` command family.
2. Add dynamic autocomplete for subcommands and managed account identifiers.
3. Make the zero-argument command open the main UI.
4. Make account selection and status flows consistently actionable.
5. Add `show`, `footer`, `rotation`, `verify`, `path`, `reset`, and `help` subcommands.
6. Persist footer settings immediately instead of waiting until panel close.
7. Add rotation settings and document the rotation behavior contract.
8. Broaden the current footer controller into a shared MultiCodex controller.
9. Replace imported-account fallback labels with real email identity when it can be derived safely.

## Command migration policy

- Move to the `/multicodex` command family as soon as it is ready.
- Remove `/multicodex-use`, `/multicodex-status`, and `/multicodex-footer` in the same change.
- Do not keep backward-compatibility aliases for the old commands.
- Update README, ROADMAP, tests, and release notes together when the command migration lands.

## Goals

- Keep the extension runnable when installed outside the pi monorepo.
- Avoid deep imports that resolve to repo-local paths.
- Keep runtime behavior compatible with pi extension docs.
- Keep the published package self-contained, including all runtime TypeScript modules it imports.
- Prefer one memorable operator command surface over several loosely related commands.
- Prefer controller-owned config and runtime state over duplicated persistence logic.

## Packaging rules

- Core pi packages must stay aligned with pi package docs.
- Keep `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, and `@mariozechner/pi-tui` in `peerDependencies` and `devDependencies` as needed for local development.
- Do not move pi core packages into normal runtime `dependencies` unless pi package docs require it.
- Keep the published tarball limited to runtime files only.

## Type safety and architecture

- Use public exports from `@mariozechner/pi-ai` and `@mariozechner/pi-coding-agent`.
- Prefer small focused modules with explicit exports over large shared files.
- Keep durable config, runtime status, and UI wiring separate.
- Normalize config on load and save.
- Let shared controller code own persistence instead of duplicating file writes in commands or panels.
- Keep hooks and command handlers thin when controller extraction work starts.

## Checks

Run:

```bash
npm run lint
npm run tsgo
npm run test
```

Release validation:

```bash
npm pack --dry-run
```

## Hook workflow

- Use `lefthook` for git hooks.
- `mise run install` should install dependencies and run `lefthook install`.
- Pre-push validation runs through `mise run pre-push`.
- Keep pre-push checks aligned with CI:
  - `pnpm check`
  - `npm pack --dry-run`

## Release workflow

- Use `semantic-release` with npm trusted publishing.
- Normal releases happen from merges to `main` through `.github/workflows/publish.yml`.
- Enforce Conventional Commits with commitlint locally and in CI.
- Use `lefthook` for the local `commit-msg` hook.
- Use `pnpm release:dry` for local release verification when needed.
- Do not use local `npm publish` for routine releases.
- Keep the npm trusted publisher mapping aligned with:
  - package: `@victor-software-house/pi-multicodex`
  - repository: `victor-founder/pi-multicodex`
  - workflow file: `.github/workflows/publish.yml`

## Commit workflow

- Do not batch unrelated changes into a single large commit.
- Commit incrementally as each logical step is completed.
- Use conventional commit messages such as `build: ...`, `docs: ...`, `refactor: ...`, `feat: ...`, and `release: ...`.
- Keep release commits focused on version bumps and release metadata only.
