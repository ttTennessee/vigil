# Vigil — Product Thesis

## One-sentence definition

> A quiet, file-watched dashboard that lets you open it in the morning and remember
> in 30 seconds where your coding-agent workflow left off, and what to do next.

## Naming

**vigil** — a kept watch, a candle left burning overnight. The product is
*the light that stays on* between sessions. It does not execute anything; it
watches and remembers, so when the human returns to the project the context
re-mounts instantly.

## Target user (first user = author)

A developer driving coding-agent workflows (GSD, superpowers, mattpocock-style
skill suites, hand-rolled markdown orchestrators) across multiple days and
sessions. Specifically:

- Works in sessions separated by hours or a full night of sleep
- Loses the in-head map between sessions (which phase, which plan, which gate)
- Currently re-orients by reading `STATE.md` / `ROADMAP.md` / scanning files
- Wants a single page that does that reading and renders it visually

## What vigil is NOT

- Not an agent IDE — no input box, no tool-permission prompts, no
  agent-process lifecycle
- Not a runtime — does not execute, schedule, retry, or checkpoint anything
- Not a real-time monitor — refresh-on-open is fine; the moment you open it
  is the moment you need it
- Not a competitor to the coding-agent runtime itself (Claude Code,
  OpenCode, Codex, etc.); it complements them by reading the artifacts they
  produce

## Core insight

The agent already executes. The workflow already writes durable state to disk
(`.planning/` for GSD-style workflows). Visibility does not require ownership
of execution — it requires faithful, low-friction rendering of state that is
already there.

## Why this framing matters

A morning-resume tool has a fundamentally different shape than a live-execution
monitor:

| Live-execution monitor | Morning-resume dashboard |
|---|---|
| Needs real-time event stream | Needs accurate reads at open time |
| Cares about current tool call | Cares about phase + plan structure |
| Optimizes for "watch it happen" | Optimizes for "where am I, what's next" |
| Tends to grow into agent IDE | Stays as a viewer, period |

Vigil is the second column, deliberately and permanently.
