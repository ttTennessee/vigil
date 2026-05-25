# Vigil — Repo Bootstrap Proposal

A first-commit-shaped plan for `vigil/`. Read this, accept or adjust,
then I'll execute the actual `npm init` / `git commit -m "initial"` step.
Nothing in here invents new architecture — it's the mechanical projection
of D1–D8 + Q1–Q19 onto a real filesystem.

---

## Directory skeleton

```
vigil/
├── .gitignore
├── .editorconfig
├── package.json
├── tsconfig.base.json        # shared compiler opts
├── tsconfig.server.json      # server-only refs
├── tsconfig.client.json      # client-only refs
├── vite.config.ts            # frontend dev/build
├── README.md
├── LICENSE                   # MIT (or whatever you prefer — tell me)
│
├── research/                 # existing — kept as-is
│   ├── 00-INDEX.md
│   ├── 01-product-thesis.md
│   ├── 02-architecture-decisions.md
│   ├── 03-gsd-observations.md
│   ├── 04-implementation-choices.md
│   ├── 05-bootstrap.md       # this file
│   └── swatches/
│       ├── palette.html
│       └── layout.html
│
└── src/
    ├── server/               # → future apps/web/server (Q5)
    │   ├── index.ts          # Hono app: HTTP + SSE entry
    │   ├── watcher.ts        # chokidar wrapper, 300ms debounce + 2s ceiling
    │   ├── sse.ts            # connection Set + broadcast
    │   ├── routes/
    │   │   ├── state.ts      # GET /api/state — full state JSON
    │   │   ├── artifact.ts   # GET /api/artifact?path=… — markdown body
    │   │   └── events.ts     # GET /events — SSE stream
    │   └── static.ts         # serve client build in prod
    │
    ├── client/               # → future apps/web/client (Q5)
    │   ├── index.html
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── TopBar.tsx
    │   │   ├── StagesColumn.tsx
    │   │   ├── PlansColumn.tsx
    │   │   ├── PlanRow.tsx
    │   │   ├── WaveLabel.tsx
    │   │   ├── ArtifactDrawer.tsx       # Q14: markdown render in middle column
    │   │   ├── FrontmatterCard.tsx
    │   │   ├── EmptyState.tsx           # variants: no-planning / newborn / partial
    │   │   ├── Glyph.tsx                # typographic state markers
    │   │   └── Chip.tsx                 # amber / failure / human / req variants
    │   ├── hooks/
    │   │   ├── useState.ts              # fetch /api/state + SSE invalidate
    │   │   └── useArtifact.ts           # fetch /api/artifact on stage select
    │   ├── styles/
    │   │   ├── tokens.css               # the palette from Q19
    │   │   ├── fonts.css                # Fraunces (Google) + Commit Mono (self-hosted)
    │   │   └── reset.css
    │   ├── markdown/
    │   │   ├── render.tsx               # react-markdown wrapper with plugin stack
    │   │   ├── components.tsx           # GSD custom XML tag mappings
    │   │   └── fileRefPlugin.ts         # remark plugin for @file/path → clickable
    │   └── lib/
    │       └── openInEditor.ts          # vscode:// scheme + VIGIL_OPEN_URL fallback
    │
    ├── parsers/              # → future packages/parsers (Q5) — PURE FUNCTIONS
    │   ├── state.ts          # parseState(text: string) → State
    │   ├── plan.ts           # parsePlan(text: string) → Plan (Q12 field set)
    │   ├── summary.ts        # parseSummary(text: string) → Summary (Q16 regex)
    │   ├── phaseDir.ts       # parsePhaseDir(files: FileEntry[]) → Phase
    │   └── README.md         # "rules of this directory" — see below
    │
    └── types/                # → future packages/types (Q5)
        ├── state.ts          # State, Phase, Plan, etc.
        └── api.ts            # API contract types (server ↔ client)
```

The four `src/` subdirectories map 1:1 to the future monorepo packages.
Moving them is a directory rename + a workspace config when the day comes.

---

## Two import bans (the load-bearing discipline from Q5)

`src/parsers/` and `src/types/` are **leaf packages in disguise**. The
following must be enforced or D1 / D7 quietly rot:

1. `src/parsers/**` MUST NOT import from `src/server/**` or `src/client/**`.
2. `src/parsers/**` MUST NOT import from `node:*` or any node-only npm
   package (`chokidar`, `fs-extra`, etc.).

Enforcement: an ESLint config (`.eslintrc.cjs`) with
`no-restricted-imports` plus a path-pattern rule. Plus a short
`src/parsers/README.md` that states the rule in prose for any human or
agent who lands here:

```markdown
# parsers/

These functions take strings and return data. They do not read the
filesystem, do not call APIs, do not import anything from server/ or
client/. This rule lets them run unmodified inside Ink, Tauri, wasm —
anywhere a future vigil host might live.

If you find yourself wanting fs in here, the answer is no — pass the
already-read string in from the caller.
```

---

## `package.json` (proposed)

```json
{
  "name": "vigil",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "bin": { "vigil": "./dist/cli.js" },
  "scripts": {
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite",
    "dev":        "concurrently -k -n srv,web -c green,cyan \"npm:dev:server\" \"npm:dev:client\"",
    "build":      "vite build && tsc -p tsconfig.server.json",
    "start":      "node dist/server/index.js",
    "typecheck":  "tsc -p tsconfig.server.json --noEmit && tsc -p tsconfig.client.json --noEmit",
    "lint":       "eslint src --max-warnings=0"
  },
  "dependencies": {
    "hono":              "^4",
    "@hono/node-server": "^1",
    "chokidar":          "^4",
    "gray-matter":       "^4",
    "react":             "^19",
    "react-dom":         "^19",
    "react-markdown":    "^9",
    "remark-gfm":        "^4",
    "rehype-raw":        "^7",
    "rehype-sanitize":   "^6",
    "motion":            "^11"
  },
  "devDependencies": {
    "@types/node":        "^22",
    "@types/react":       "^19",
    "@types/react-dom":   "^19",
    "@vitejs/plugin-react": "^4",
    "concurrently":       "^9",
    "eslint":             "^9",
    "tsx":                "^4",
    "typescript":         "^5",
    "vite":               "^5"
  }
}
```

Notes:

- **No state library** (Redux / Zustand / Jotai). Vigil's state is
  read-only and shaped by the server fetch — `useState` + a single
  `useState` hook for the fetched `State` is enough.
- **No CSS framework**. Tailwind would push us toward generic utility
  vocabulary and away from Night-watch. Plain CSS files + CSS variables
  (Q19 tokens) is the language.
- **No `@hono/node-server` later** — using it from day one because
  Hono on raw Node needs an adapter.
- **`motion`** (motion.dev) over `framer-motion` — the package was
  renamed; same maintainer, modern API.
- **No syntax highlighter** in the deps list — Q17 defers it.

---

## `README.md` (proposed outline — short on purpose)

```markdown
# vigil

A quiet, file-watched dashboard for coding-agent workflows that write
durable state to disk. Opens in the morning and remembers in 30 seconds
where you left off.

## Install

    npm install -g vigil

## Run

    vigil                       # auto-discover .planning/ from cwd
    vigil ~/project/foo         # explicit path

Then open http://localhost:7171.

## Override the editor

By default, `open in editor` uses the `vscode://` URL scheme (Cursor /
Windsurf / Trae / any VS Code fork). To use a different editor:

    export VIGIL_OPEN_URL="cursor://file/%s"

`%s` is the URL-encoded absolute path.

## What it watches

A `.planning/` directory produced by a GSD-style workflow. See
[`research/03-gsd-observations.md`](research/03-gsd-observations.md).

## What it is and isn't

See [`research/01-product-thesis.md`](research/01-product-thesis.md).

## License

MIT
```

No badges, no screenshots-at-the-top, no "Why vigil?" section. The README
is for users who already typed `npm install`; the rest is in `research/`.

---

## First-commit shape

Single commit, message: `initial: vigil v0.0.1 — bootstrap + design language`.

Includes:

- The directory skeleton above
- Empty-but-typechecking entry points: `src/server/index.ts` boots a
  Hono server on 7171, `src/client/main.tsx` mounts `<App />` that shows
  the no-planning empty state
- The `research/` tree as it stands now (after this file is accepted)
- `package.json`, `tsconfig.*`, `vite.config.ts`, `.eslintrc.cjs`,
  `.gitignore`, `.editorconfig`, `README.md`, `LICENSE`

Excludes:

- Any actual parser logic (will follow in commit 2: `parsers: STATE.md +
  PLAN.md + SUMMARY.md`)
- Any rendering beyond the empty state (will follow in commit 3:
  `client: detail view at parity with research/swatches/layout.html`)
- SSE wiring (commit 4)
- Drawer / markdown (commit 5)

The point of commit 1 is **a runnable shell** — `npm run dev` opens the
browser to a paper-colored empty state. Everything after that is adding
content into that frame.

---

## What I need from you before executing

1. **License**: MIT? Apache-2.0? Unlicense? Default is MIT.
2. **Repo name on GitHub** (if/when we push): `vigil` taken on npm
   (small unrelated package). Options: `@<you>/vigil`, `vigilcli`,
   `vigil-watch`, or keep local-only for now. Default: keep local for
   the v0.0.1 commit, decide publish-name later.
3. **Anything in the skeleton you'd cut or move.** A reasonable veto
   here: "do not split tsconfig into three files, use one"; "do not put
   `markdown/` under `client/`, hoist it to `src/markdown/`"; etc.

Reply with answers (or "all defaults, go") and I'll execute.
