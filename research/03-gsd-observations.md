# GSD Observations

Notes from reading the `get-shit-done-redux-next` repository
(`~/project/get-shit-done-redux-next`), specifically `docs/ARCHITECTURE.md`,
`docs/STATE-MD-LIFECYCLE.md`, and `docs/workflow-discuss-mode.md`.

These observations directly shape what vigil reads and how it renders.

---

## What GSD is

A **meta-prompting framework** that orchestrates coding-agent runtimes
(Claude Code, OpenCode, Codex, Gemini CLI, Cursor, Cline, and ~10 others)
through markdown-defined workflows. Provides:

1. Context engineering — structured artifacts per task
2. Multi-agent orchestration — thin orchestrators spawn specialized agents
   with fresh context windows
3. Spec-driven development — requirements → research → plan → execute →
   verify pipeline
4. File-based state — durable memory across sessions and context resets

**Key bet:** Do not own the runtime. Use the host AI's primitives
(Task subagent, hooks) as the runtime; use the filesystem as the database.

---

## Workflow phase lifecycle

```
new-project ─► discuss-phase ─► [ui-phase] ─► plan-phase ─► execute-phase ─► verify-work ─► [ui-review]
                  │                                │              │              │
                  ▼                                ▼              ▼              ▼
              CONTEXT.md                       PLAN.md       SUMMARY.md   VERIFICATION.md / UAT.md
```

Each phase has explicit gates (Confirm, Quality, Safety, Transition). Gates
can pause the workflow waiting on human verification (`checkpoint:human-verify`).

**execute-phase** groups plans into dependency waves; plans within a wave run
in parallel via parallel `gsd-executor` subagents. Waves run sequentially.

---

## Filesystem layout vigil watches

```
.planning/
├── PROJECT.md              # vision, constraints, decisions
├── REQUIREMENTS.md         # scoped v1/v2/out-of-scope
├── ROADMAP.md              # phase breakdown with status
├── STATE.md                # current position, decisions, blockers (KEY)
├── config.json             # workflow configuration
├── phases/
│   └── XX-phase-name/
│       ├── XX-CONTEXT.md       # discuss output
│       ├── XX-RESEARCH.md      # plan-phase research
│       ├── XX-YY-PLAN.md       # execution plans (multiple per phase)
│       ├── XX-YY-SUMMARY.md    # plan execution outcome (appears when done)
│       ├── XX-VERIFICATION.md  # post-execute verification
│       └── XX-UAT.md           # user acceptance test results
│       ├── XX-DISCUSSION-LOG.md # discuss-stage conversation log (appears in real samples; not in original template list)
│       ├── XX-REVIEW.md         # review artifact (appears in real samples; purpose TBD)
└── (other dirs: quick/, todos/, debug/, threads/, etc.)
```

**Vigil's primary read targets:** `STATE.md`, `ROADMAP.md`, and
`phases/XX-*/` directory contents.

---

## STATE.md frontmatter (the status-line contract)

GSD's status-line hook already parses STATE.md frontmatter. Vigil should
parse the same fields and render them richer:

```yaml
---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Code Quality
status: in_progress              # or: discussing | planning | executing | verifying
active_phase: "4.5"              # populated while orchestrator in flight
next_action: execute-phase       # recommended next command (when idle)
next_phases: ["4.5"]             # phases the action applies to
progress:
  total_phases: 17
  completed_phases: 10
  percent: 59
---
```

**Parsing constraint:** frontmatter must start at byte 0; `next_phases`
must be single-line YAML flow (`["4.5", "4.6"]`), not block sequence.
Vigil should match this for compatibility, but can be more generous in
the body.

**Status-line scene priority (mirror this):**

1. If `active_phase` populated → "Phase X in flight, stage Y"
2. Else if `next_action` + `next_phases` populated → "next: do X on phase Y"
3. Else if `percent == 100` → "milestone complete"
4. Else → fallback rendering

---

## Plan / wave inference (week-1 rules)

For a given `phases/XX-phase/` directory:

| Plan state | Inference rule (file-watch only) |
|---|---|
| **done**       | `XX-YY-SUMMARY.md` exists |
| **pending**    | `XX-YY-PLAN.md` exists, no SUMMARY |
| **running**    | PLAN exists, no SUMMARY, and `STATE.md.active_phase == XX` (heuristic — ~95% accurate, sufficient for morning-resume) |
| **failed**     | SUMMARY exists and parses to a failure marker (specifics TBD by reading real SUMMARY samples) |

**Wave structure: read, do not infer.** GSD's planner pre-computes the wave
number and writes it into each PLAN.md frontmatter (`wave: N`). Vigil reads
the field directly — no transitive-dependency-graph computation needed.
`depends_on:` is also in frontmatter as an explicit array of plan IDs
(e.g. `[01-01]`), useful only for rendering edges/lines between plan cards.

## PLAN.md frontmatter (the real schema, from samples)

Sourced from `templates/phase-prompt.md` and real PLAN files under
`~/project/zs/.planning/phases/`:

```yaml
---
phase: 01-backend-foundation   # phase dir name
plan: 02                       # plan number within phase
type: execute                  # always "execute" for PLAN files
wave: 2                        # pre-computed by planner — read, don't infer
depends_on: [01-01]            # plan IDs blocking this one
files_modified: [<path>, ...]  # filesystem touchpoints (D4-P2)
autonomous: true               # false → plan halts for human checkpoint (D4-P1)
requirements: [LOC-02]         # requirement IDs from ROADMAP
user_setup: []                 # human-required setup the agent cannot automate
must_haves:                    # goal-backward verification (not parsed in week 1)
  truths: [...]
  artifacts: [...]
  key_links: [...]
---
```

**Week-1 parser extracts only:** `phase, plan, wave, depends_on,
files_modified, autonomous, requirements`. The rest is left for when an
actual UI feature demands it (see D7).

---

## Hook events (not used in week 1, noted for later)

GSD ships 11 hooks that integrate with host runtimes. For future
expansion, the relevant ones are:

| Hook | Event | Signal |
|---|---|---|
| `gsd-statusline.js` | `statusLine` | session metadata → `/tmp/claude-ctx-{session}.json` |
| `gsd-context-monitor.js` | `PostToolUse` | context % remaining + warnings |
| `gsd-phase-boundary.sh` | `PostToolUse` | phase transition detection |
| `gsd-session-state.sh` | `PostToolUse` | session state tracking |

**Not for week 1.** Logging this so we don't rediscover it later.

---

## Runtime install surfaces

GSD installs into 14+ runtimes with slightly different paths and config
formats. Vigil's first version targets one common case (Claude Code with
local `.planning/`), but the read logic should not assume host-runtime
specifics — only the `.planning/` shape, which is the same across all
runtimes GSD supports.

---

## Two-stage hierarchical routing (v1.40)

GSD's command surface is 86 concrete commands grouped into 6 meta-skills
(`gsd-workflow`, `gsd-project`, `gsd-quality`, `gsd-context`, `gsd-manage`,
`gsd-ideate`). Vigil does not need to model this routing — but if vigil
ever surfaces "next available action," it should present user-facing
commands in the bare form (`/gsd-execute-phase 4.5`), not namespaced.

---

## What vigil deliberately does NOT use

- The `gsd-sdk query` programmatic SDK — would require vigil to depend on
  GSD's Node module, breaking the zero-touch principle (D1).
- The `gsd-tools.cjs` CLI — same reason. Vigil reads files directly.
- Hook events — week-1 scope is files only (see D1).

The whole point is: read what GSD has already written to disk. GSD's own
tools are for GSD; vigil is a separate, file-only consumer.
