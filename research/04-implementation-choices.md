# Implementation Choices (Q1–Q14)

Outcome of the architecture interview. Each row is a settled decision +
one-line rationale. Where a decision was promoted to an architecture
principle, the linked D# is the load-bearing reference; this file is the
shortest path back to what we picked, not the why-in-full.

Read alongside `02-architecture-decisions.md` (D1–D8) and
`03-gsd-observations.md` (the schema vigil reads).

---

## Stack & wiring

| # | Decision | Choice | Why (one line) |
|---|---|---|---|
| Q1 | Form factor | Local web app | Cheapest medium for the information-dense detail view; TUI / Tauri remain open later, not blocked. |
| Q2 | Freshness model | SSE that pushes an **invalidate signal only**, not state | Live updates are cheap once watcher exists; keeping payload to a ping avoids serializing state and matches "user-refresh" semantics. |
| Q3 | Runtime | Node + `npx vigil` | Coding-agent users have Node by default; lowest install friction. Bun is fine later, not load-bearing. |
| Q4 | Frontend framework | React 19 | Component thinking carries 1:1 to Ink (future TUI); largest ecosystem; nothing in vigil's size pushes back. |
| Q5 | Build / structure | Vite, **single package, monorepo-ready folders** | Defer real monorepo until app #2 exists. `src/{server,client,parsers,types}` with two import rules: parsers cannot import server/client, parsers cannot import `node:*`. |
| Q6 | HTTP framework | Hono | SSE is first-class (`streamSSE`); TS-native; runtime-portable (Node today, Bun/Tauri-sidecar later free). |
| Q7 | File watcher | chokidar | Cross-platform atomic-write handling; `.planning/` is small so perf is moot. |
| Q13 | Launch / discovery | `vigil [path]` + auto-discover `.planning/` from cwd; fixed port **7171** (+1 on conflict); `~/.config/vigil/recent.json` holds paths only | See [D8](02-architecture-decisions.md#d8-cli-surface-is-constant-recentjson-holds-paths-and-nothing-else). No subcommands, ever. |
| Q15 | SSE protocol | **300ms debounce + 2s ceiling**; payload is empty (`event: invalidate\ndata: {}`); single server-side watcher broadcasts to a `Set` of connections; rely on native `EventSource` auto-reconnect, frontend calls `fetchState()` in `onopen`. | 300ms covers chokidar atomic-write bursts (50–150ms); 2s ceiling covers slow writes (e.g. an 800-line SUMMARY.md taking 1–2s) so the UI doesn't sit silent then jump-update. Empty ping keeps SSE as pure invalidation signal — HTTP GET is the single source of truth. |
| Q18 | Open in editor | Default: `vscode://file/{abs}` URL scheme (covers VS Code, Cursor, Windsurf, all VS Code forks). Override: `VIGIL_OPEN_URL` env var with `%s` placeholder for URL-encoded absolute path (e.g. `cursor://file/%s`). Every "open in editor" affordance has a quiet adjacent copy-path button (`navigator.clipboard.writeText`) as the permanent fallback. Server never spawns editor processes. | Env var honors D8 (no config files, no `recent.json` keys) while giving non-VS-Code users an escape hatch. Server-spawn was the most tempting wrong answer: in web-app form it puts vim in a hidden tty, in Tauri form it rewrites itself, and it edges toward executor territory (D5). Copy-path is the universal fallback that needs zero setup. |

---

## Layout & visual surface

| # | Decision | Choice | Why (one line) |
|---|---|---|---|
| Q8/Q9 | Detail-view layout | **Two columns + a top status bar.** Top bar = project path + active phase + next-action. Left = stages (~1/5 width). Right = plans grouped by wave (~4/5 width). | Three columns wasted 1/3 screen on what is usually a one-liner; next-action belongs in the global header; "blocked" is shown inline at the wave where it actually blocks, not in a sidebar. |
| Q10 | Stage asymmetry (D4-P3) | **Click behavior asymmetric** — clicking a stage swaps the middle column to that stage's artifact view. Week-1 implements only the execute view (waves + plans); other stages show a summary card + open-in-editor for now. | "Same rectangle, different color" violates P3 in spirit; structural asymmetry that mirrors GSD's real artifact types does not. Default-selected stage = `STATE.md.active_phase`'s current stage. |
| Q11 | Running-plan UX | `◐ running · {mtime} ago` chip. Glyph from the heuristic; chip is the raw evidence. | See [D6](02-architecture-decisions.md#d6-surface-evidence-not-judgments). One mechanism collapses "alive / crashed / just finished" into a self-explanatory display. No configurable threshold. |
| Q14 | Stage drawer / artifact preview | **Full markdown render**, with two hard collars: (a) cap at first 500 lines OR 8000 chars (whichever hits first), then a footer chip `showing first N lines · full content: open in editor →`; (b) frontmatter is stripped from body and surfaced as a structured summary chip in the drawer header. | A (full render) is what the 30-second-resume promise actually needs for non-execute stages. The two collars stop A from devouring the drawer or duplicating frontmatter inline. |
| Q17 | Markdown renderer | `react-markdown` + `remark-gfm` + `rehype-raw` + `rehype-sanitize` (whitelisted). GSD custom XML tags (`<task>`, `<objective>`, `<execution_context>`, `<acceptance_criteria>`, `<verify>`, `<context>`) map to dedicated React components via the `components` prop. `@file/path` references render as clickable links wired to Q18's "open in editor" mechanism. Code blocks render as plain `<pre><code>` for week-1; syntax highlighting deferred. Truncation (500 lines / 8000 chars) happens on the raw markdown string **before** ReactMarkdown sees it. | Only `react-markdown` turns "render GSD's custom XML as real React components" into 5 lines instead of token-hacking. `marked` / `markdown-it` are smaller but lose all the extension affordances we actually need. Code highlighting is D7-deferred: don't build a capability before the UI demands it. |

---

## Parsing

| # | Decision | Choice | Why (one line) |
|---|---|---|---|
| Q12 | PLAN.md fields parsed | Exactly: `phase, plan, wave, depends_on, files_modified, autonomous, requirements`. Nothing else, until a UI feature demands it. | See [D7](02-architecture-decisions.md#d7-parse-exactly-what-you-render). Each field maps to a concrete rendered element. `must_haves`, `user_setup`, `type` are not parsed. |
| Q12-cor | Parser tolerance | Field-missing defaults table (wave → 1; depends_on → []; autonomous → true; files_modified → skip chip; requirements → skip chip). Never crash; never popup. | Morning-resume at 9am with a red error is the worst possible experience. |
| Q16 | SUMMARY.md failure detection | One body-line regex: `^## Self-Check: (PASSED\|FAILED)$`. FAILED → failed. SUMMARY exists with PASSED or no marker → done. **No other body content is parsed.** | GSD's `execute-plan` workflow contracts this exact line as the success/failure marker. Everything else (Deviations, Issues Encountered, etc.) gets rendered via Q14's markdown drawer on demand — not pre-parsed. |
| Q16-vis | Failure visuals | `✓ green` (done) / `✓ muted + chip "no self-check"` (done without marker) / `✗ red + clickable chip "self-check failed"` (failed). Failure chip click opens the drawer scrolled to the Self-Check + Deviations / Issues Encountered sections, not the top. | D6 evidence-bearing. Failed chip is the only state where vigil proactively navigates the drawer to a specific section — because "why did it fail" is what the user needs and the SUMMARY is where it lives. |
| Q16-tx | Failure containment | Failed plan does NOT mark its downstream as "blocked" — vigil cannot know whether the user will fix, skip, or fork. Instead: phase header gets a small chip `N plan failed`, clickable, jumps to the first failed plan. | Wave-level "blocked-by-failure" inference is judgment, not evidence. Phase-level count is just arithmetic on observable state. |

---

## Visual language (Q19)

Direction: **"Night-watch journal"** — vigil is a journal kept by a candle
in the dark, not a dashboard glowing in your face. Editorial-archival,
warm low-key. The differentiation hook: vigil evidences *persistence*,
not *activity*.

| Axis | Value | Notes |
|---|---|---|
| Background | `#181410` (warm dark ink, brown-leaning) | Picked from a 4-candidate side-by-side swatch. Candidate 2: deeper than the original `#1c1815` proposal but stops short of OLED-black via the brown tint. See `swatches/palette.html`. |
| Foreground (primary text) | `#e8e1d3` (aged paper) | Pairs at WCAG AA on bg-2; reads as ink-on-paper, not white-on-screen. |
| Foreground (muted) | `rgba(232, 225, 211, 0.45)` | One transparency stop, not a separate gray variable — keeps muted text in the same color family. |
| Foreground (faint) | `rgba(232, 225, 211, 0.18)` | For pending / `○` glyphs and faint chip borders. |
| Hairlines / dividers | `rgba(232, 225, 211, 0.08)` | No card shadows anywhere — hairlines only. Shadow is material-design language and conflicts with the paper metaphor. |
| Accent · amber | `#d4a04f` (candle flame) | **The only "alive" color in the app.** Used for: `◐ running`, the `▶ next: ...` line in the top bar, the human-checkpoint chip. If amber is on screen, vigil is saying "this is where the candle is burning right now." |
| Success · sage | `#7d9070` | `✓ done` glyph. Muted on purpose — done plans should recede, not parade. |
| Failure · terracotta | `#c46856` | `✗ failed` glyph + clickable failure chips. Reads as "needs attention" not "emergency." |
| Display typeface | **Fraunces** (variable: opsz, SOFT, WONK axes) | Loaded from Google Fonts. Used for: phase headers, drawer titles, the `vigil` wordmark. Body uses opsz 14–36; the wordmark uses opsz 144 + SOFT 100 + WONK 1 for a one-off splash of character. |
| Mono / data typeface | **Commit Mono** (planned; preview uses IBM Plex Mono as stand-in) | Used for: plan IDs, glyphs, chips, code, frontmatter — basically everything that isn't a header. Editorial-mono, designed for long reading. Commit Mono requires manual download (not on Google Fonts); we'll self-host. |
| State glyphs | Typographic, drawn from the mono font: `✓ ● ◐ ○ ⚠ ✗` | No icon library. "Vigil is text" — pulling in Heroicons / Lucide instantly corporate-izes the surface. |
| Paper-grain texture | SVG `feTurbulence` noise overlay at ~2.5% opacity | Grounding atmosphere. Visible at the edge of awareness, not a feature. |
| Motion principle | Page-load: per-row fade-in with ~50ms stagger. SSE invalidate: brief opacity dip on swap (no slide/scale). mtime / timestamps: silent text update, no animation. | Vigil evidences *persistence*, not *activity*. Motion should read as stillness — a candle does not flicker for attention. |
| Forbidden | Blue (any shade), card shadows, icon libraries, gradient meshes, syntax-highlighted code in week-1, "loading spinners" anywhere | Each is a step toward `corporate dashboard` / `Notion clone` / `Linear clone` — directly off-thesis. |

The swatch file (`research/swatches/palette.html`) is the canonical preview
of these choices applied to a real plan-row context. Re-open it before
making any future color/type change to verify the new value still belongs.

## Empty / edge states (Q13 follow-up)

Three legitimately different states, each its own component, not one
component with branching copy:

| State | Trigger | Render |
|---|---|---|
| **no-planning** | No `.planning/` reachable from cwd or CLI arg | Centered: "no .planning/ found under {cwd}" + hint to point vigil at a project or run `/gsd-discuss`. |
| **newborn-planning** | `.planning/` exists; `phases/` empty or missing | Top bar normal; main area lists which root-level files DO exist (`PROJECT.md ✓`, `REQUIREMENTS.md ✓`, missing items in muted). Hint: "run `/gsd-plan-phase` to produce the first phase." |
| **partial-planning** | `phases/` populated but STATE.md missing or malformed | Render phases best-effort; top bar shows small `no STATE.md` evidence chip. No popup. Covered by D7 parser tolerance. |

---

## Open items (deferred, not forgotten)

Tracked here so the next session doesn't rediscover them:

- **Visual language full pass** — color system, typography, icon set, motion language. Must load `/frontend-design` skill before this round (see memory: `feedback_frontend_design_skill`).
- **Repo bootstrap** — first commit shape, `package.json` starter, README scope. Intentionally unset; tackle at the moment of starting to code.
