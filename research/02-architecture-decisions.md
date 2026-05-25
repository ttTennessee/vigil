# Architecture Decisions

Each section captures one decision, the alternatives considered, and the
reason for the choice. These are load-bearing — revisit explicitly before
changing.

---

## D1. Data source: file-watch only (week 1)

**Decision:** Vigil watches a `.planning/` directory (or equivalent) with
`chokidar` (or platform watcher) and renders the parsed state. No hook
integration, no IPC, no protocol negotiation with the host agent runtime.

**Alternatives considered:**

- *Sidecar hook*: write a small hook script that the host runtime calls into,
  emitting precise "plan started / plan finished" events to a local vigil
  server.
- *ACP host*: vigil becomes the agent client, spawns Claude Code / OpenCode
  / Codex as subprocess, captures the full event stream natively.

**Why file-watch wins for week 1:**

1. **Zero-touch on the host.** Anyone can `git clone` a project that uses a
   supported workflow and point vigil at its `.planning/` — no install
   contract, no hook registration, no settings.json edits.
2. **The data is already there.** GSD-style workflows persist all meaningful
   state to disk as part of their design. The product target (morning resume)
   does not need any signal that isn't in those files.
3. **Sidecar and ACP are seductive but expensive.** Sidecar requires writing
   per-runtime hooks (Claude Code, OpenCode, Codex, Gemini all differ). ACP
   host requires building an entire agent client (input UX, permission UX,
   process lifecycle, multi-session) before the visualization itself is
   even built. Both routes have ~90% of their code outside the actual
   visualization.

**When to revisit:** Only when concrete, repeated friction proves the
file-watch signal is insufficient — e.g., "I keep wanting to know which
plan is *actually* running right now and the heuristic is wrong often
enough to matter." Not before.

---

## D2. Stance: pure observer, never an executor

**Decision:** Vigil never spawns an agent, never invokes a workflow command,
never modifies project files. It is read-only with respect to the project.

**Why this is non-negotiable:**

The instant vigil owns execution, three things follow inevitably:

1. It needs an input UX (user prompts to the agent)
2. It needs a permission UX (allow/deny tool calls)
3. It needs process management (spawn, healthcheck, restart, multi-session)

Each of these expands by an order of magnitude on its own. Together, they
turn vigil from "a quiet morning dashboard" into "an agent IDE." That is a
real product category, but it is not the one being built here.

**Hard boundary check:** Any feature proposal that requires vigil to write
to the project, spawn a subprocess that does, or communicate with a running
agent — rejected. The host runtime executes; vigil watches.

---

## D3. First view: current-phase detail (master/detail, detail first)

**Decision:** Week 1 builds the detail view (one phase at a time, with its
stages and plans), not the global roadmap. The roadmap becomes a thin
navigation shell added later.

**Why detail-first:**

- The detail view is the **information-dense** page. It is where layout,
  state colors, and the wave/plan structure actually have to be designed
  well. If it works, the roadmap shell wraps around it trivially.
- The reverse order is a trap: a roadmap view alone is satisfying to render
  but useless to click into (nothing on the other end). Doing roadmap first
  leads to building "navigation to nothing."
- The detail view directly delivers the 30-second morning-resume promise.
  Roadmap only delivers it after you click through.

**Scope of the detail view (week 1):**

- Input: a path to a phase directory (or to `.planning/`, auto-pick current phase)
- Output: stages of the phase + plan list + dependency/wave structure +
  per-plan status (done / pending / failed / running-by-heuristic)
- No: real-time updates, multi-phase view, history playback, file diffs,
  gate-conversation visualization

---

## D4. Coding-workflow design principles (carry forward into every feature)

These are not features; they are constraints that any vigil view must
respect. They come from observing how coding-agent workflows differ from
unattended-automation workflows.

**P1. Human-in-the-loop is first-class.** Coding workflows are not "press
start and walk away." Each stage is human-initiated, each gate is a place
where the AI may interrogate the human. Vigil must surface "where is the
human expected to act next" as a primary signal, not buried metadata.

**P2. Filesystem state is part of workflow state.** A coding workflow that
rewinds without rewinding the files it has changed has only rewound the
illusion of state. Any rollback / fork / time-travel feature must treat
the filesystem as a participant, not just the JSON/markdown control
plane. (Vigil is observer-only for now, so this manifests as: surface
*what files changed at each stage*, not just "stage X done.")

**P3. Stages have asymmetric weight.** Discuss / plan / execute / verify
are not interchangeable nodes — discuss is where decisions get locked,
plan is where structure forms, execute is where the file world changes,
verify is where reality is checked. The view must let those four feel
different, not render them as identical rectangles.

---

## D5. Architectural firewall: no scope creep into adjacent categories

**Decision:** Vigil refuses to grow into any of the following, even when
nearby:

- Workflow editor (define new workflows in vigil's UI)
- Workflow runtime (execute defined workflows)
- Static verification (deadlock / liveness / boundedness checks on
  workflow definitions)
- Time-travel debugger (rewind execution state)
- Agent marketplace / template library

These are adjacent and tempting. Each of them is a different product with
a different shape. Vigil's promise is morning-resume orientation; nothing
on this list serves that promise.

If, after deep use, one of these proves indispensable — start a separate
project for it. Do not merge.

---

## D6. Surface evidence, not judgments

**Decision:** Where vigil makes a probabilistic claim (e.g. "this plan is
running"), attach the raw evidence (e.g. "last file touch 47m ago") so the
user can override vigil's claim by eye, without vigil having to be right.

**Corollary:** Do NOT introduce configurable thresholds (e.g.
`running_stale_threshold_minutes`) for evidence display. Show the raw value
always; let visual weight (muted color past a soft boundary) hint at concern
without claiming knowledge.

**Why this is load-bearing:**

The running heuristic (D1, week-1 inference rule) is ~95% accurate. The 5%
failure mode that actually hurts is "agent crashed but STATE.md still claims
active" — user wastes hours waiting on a dead process. Attaching raw mtime
to the ◐ running glyph collapses three distinct cases into one self-evident
display:

| Case | Display | User judges |
|---|---|---|
| Actually running | ◐ running · 12s ago | alive, wait |
| Crashed (F1) | ◐ running · 47m ago (chip muted) | dead, check terminal |
| Just finished, no SUMMARY yet (F2) | ◐ running · 3s ago | wait a beat |

The chip is closer to the product's essence than the running label itself:
**it is evidence, not judgment. Judgment can be wrong; evidence cannot.**

**Hard boundary check:** Any feature proposal that introduces a config knob
to gate, hide, or threshold an evidence display — rejected. Evidence is
always shown. Visual weight is the only "interpretation" vigil applies.

---

## D7. Parse exactly what you render

**Decision:** Vigil's parsers extract only the fields that the current UI
renders. No speculative "parse it now, render it later" — even when the
field is already sitting in the same YAML frontmatter that's being parsed
for other reasons.

**Why:**

"YAML.parse is free" is the seductive argument for over-extraction. It is
wrong, because the cost of extraction is not the parse — it is the type
declarations, the test surface, the schema-drift exposure, and the future
scope-creep invitation that come with carrying an unused field.

Specific failure modes of pre-emptive parsing:

1. **Schema rot.** GSD changes a field's meaning; vigil's parser still
   extracts it, no UI depends on it, so nothing breaks visibly. The bug
   surfaces months later when someone finally adds UI on top of stale data.
2. **Scope creep invitation.** Next agent / contributor sees the parsed
   field unused and says "we already have it, may as well render it" —
   and now vigil is creeping toward must-haves checklists, requirement
   trace-back panels, or other adjacent-product features that D5 already
   refused.
3. **Hidden product decisions.** "What vigil renders" is the product
   surface. "What vigil parses" should be a shadow of that. Divergence
   between them means there is an unacknowledged plan to extend the
   surface — and that plan needs to be made explicit (or rejected) rather
   than smuggled in as parser code.

**Week-1 PLAN.md field set (per Q12 / C):**
`phase, plan, wave, depends_on, files_modified, autonomous, requirements`.
Everything else (`must_haves`, `user_setup`, `type`) is left unparsed
until a concrete UI feature requires it.

**Parser tolerance table (a corollary, not a separate decision).** A
parser that follows D7 still cannot afford to crash on real-world input.
Defaults when a field is missing:

| Missing field    | Default behavior |
|---|---|
| `wave`           | Group plan under wave 1 (or a dedicated "unscoped" group if multiple plans lack `wave`) |
| `depends_on`     | Treat as empty array — no incoming edges |
| `autonomous`     | Default to `true` (optimistic — avoids flagging legacy plans with a noisy "needs human" chip) |
| `files_modified` | Skip the files chip on the plan card; render the plan normally otherwise |
| `requirements`   | Skip the requirement chip; render the plan normally otherwise |

**Hard boundary check:** No parse-error popups, no red banners, no crash
screens on opening vigil. A `.planning/` directory that does not exist,
a STATE.md without frontmatter, a PLAN.md missing required fields —
each should degrade to a partial render with a quiet inline note, not a
blocking error. "Open at 9 AM and see a red error" is the worst possible
morning-resume experience.

---

## D8. CLI surface is constant; recent.json holds paths and nothing else

**Decision:** Vigil's command-line surface is exactly two shapes,
forever:

```
vigil              # auto-discover .planning/ from cwd, up to $HOME
vigil <path>       # open the .planning/ at or under <path>
```

There are **no subcommands** — no `vigil ls`, `vigil clear`, `vigil
config`, `vigil add`, `vigil rm`. The CLI is the launcher, not an admin
tool.

`~/.config/vigil/recent.json` stores **only** an array of absolute
paths to projects vigil has successfully opened:

```json
{"recent": ["/home/u/proj-a", "/home/u/proj-b"]}
```

Capped at the most recent 8 entries. Mutated only on a successful project
load (the path goes to the front; duplicates are deduped; the tail is
trimmed). If a user wants to clean it, they open the file in an editor —
vigil does not provide a UI or CLI for managing it.

**What recent.json must NEVER hold:**

- Per-project preferences (last-viewed phase, theme, layout density)
- Window state (size, position, zoom)
- Auth tokens, telemetry IDs, feature flags
- Anything else

**Why both halves of this decision are load-bearing:**

Subcommands and config files grow without bound. Once `vigil ls` exists,
`vigil ls --json` is reasonable. Once `recent.json` has a `theme` field,
`recent.json` has a `keybindings` field. Each addition feels small,
collectively they convert vigil from "a viewer with two CLI shapes" into
"a tool with its own configuration surface" — which is exactly the
D5-prohibited drift toward IDE territory.

Holding the line at "two CLI shapes + one path array" makes the boundary
self-enforcing: there's nowhere for new admin features to land. If
something genuinely needs to be configurable, that pressure must be
resolved by *changing the product*, not by adding a config field.

**Hard boundary check:** Any proposal that adds a subcommand, a flag
beyond `--help` / `--version`, or a new key in `recent.json` —
rejected by default. Reopen the decision explicitly if you truly need
to cross the line; do not slip past it.
