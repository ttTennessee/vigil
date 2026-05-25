# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

vigil is a file-watched dashboard for coding-agent workflows that write durable state to a `.planning/` directory. Distributed as a global npm CLI (`vigil [path]`) that serves a local dashboard at `http://localhost:7171`. Node ≥20, ESM only.

Product thesis, architecture decisions, and the `.planning/` schema vigil consumes live under `research/` — `00-INDEX.md` lists them. Read these before changing parsing or UI semantics.

## Commands

- `npm run dev` — concurrently runs Hono server (tsx watch, port 7171) and Vite dev client (port 5173, proxies `/api` and `/events` to the server)
- `npm run dev:server` / `npm run dev:client` — run either side alone
- `npm run build` — builds client (Vite → `dist/client`) then server (tsc → `dist/server`)
- `npm start` — runs the built server (`dist/server/index.js`); this is also the `vigil` bin entry
- `npm run typecheck` — typechecks both `tsconfig.server.json` and `tsconfig.client.json`
- `npm run lint` — eslint with `--max-warnings=0`

No test runner is configured yet.

## Architecture

Three source areas, enforced as a strict dependency DAG by `eslint.config.js`:

- **`src/types/`** — pure shared types (e.g. `StateResponse`, `Phase`, `Plan`). Leaf module: cannot import from `server/` or `client/`.
- **`src/parsers/`** — pure string → data functions. May not import `fs`, `path`, `node:*`, `chokidar`, or anything from `server/` / `client/`. Callers pass already-read strings in. This is decision **D7 "parse exactly what you render"** (`research/02-architecture-decisions.md`) — parsers extract only fields the UI uses, no speculative extraction, and stay portable to Ink/Tauri/wasm hosts.
- **`src/server/`** — Hono app on port 7171. Owns filesystem I/O (chokidar watching `.planning/`) and exposes `/api/state` (and eventually `/events` SSE). Currently a stub that always returns `kind: 'empty'`.
- **`src/client/`** — React 19 + Vite SPA. Entry `src/client/main.tsx` mounts `App.tsx`. Static design tokens / fonts under `styles/`. Reads server via the Vite proxy in dev, served from `dist/client` in prod.

The wire contract between server and client is `StateResponse` in `src/types/state.ts` — a discriminated union of `{ kind: 'state', state: State }` (phases, plans, stages) and `{ kind: 'empty', empty: EmptyResponse }` (variant explains why no `.planning/` was usable). Changes here ripple to both sides.

`VIGIL_OPEN_URL` env var overrides the editor-open URL scheme (default `vscode://`, `%s` = URL-encoded absolute path).

## Agent skills

### Issue tracker

Issues live in the `ttTennessee/vigil` GitHub repo, accessed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles, mapped 1:1 to label strings of the same name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
