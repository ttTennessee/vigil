# Vigil — Research Index

Snapshot of the design conversation that produced this project.
Read in order; each file is short.

| # | File | What it is |
|---|---|---|
| 01 | [`01-product-thesis.md`](01-product-thesis.md) | What vigil is, who it's for, what it deliberately is not |
| 02 | [`02-architecture-decisions.md`](02-architecture-decisions.md) | Load-bearing decisions (D1–D8) and their rationale |
| 03 | [`03-gsd-observations.md`](03-gsd-observations.md) | What GSD looks like on disk; what vigil reads |
| 04 | [`04-implementation-choices.md`](04-implementation-choices.md) | Q1–Q19 condensed: stack, layout, parser fields, empty states, visual language |
| 05 | [`05-bootstrap.md`](05-bootstrap.md) | Repo bootstrap proposal — skeleton, package.json, README, first-commit shape |
| sw | [`swatches/palette.html`](swatches/palette.html) · [`swatches/layout.html`](swatches/layout.html) | Visual mockups — open in a browser before changing colors / typography / layout |

## TL;DR

**Vigil** is a file-watched, read-only dashboard for coding-agent
workflows that write durable state to disk (GSD-style `.planning/`).
Its single job is to let the author open it after a break and
re-orient in 30 seconds: which phase, which stage, which plans are
done, what to do next.

**Hard boundaries (D2, D5):**

- Does not execute anything
- Does not host an agent
- Does not edit project files
- Does not grow into an editor, runtime, verifier, or marketplace

**Week-1 deliverable:** the current-phase detail view — stages + plans +
wave structure + state colors — fed by file-watching one `.planning/`
directory.

## Open items (deferred, not forgotten)

- Repo bootstrap: first commit shape, deadline. Intentionally left
  unset; tackle when starting to code.
- Per-plan status accuracy beyond the file-watch heuristic — only address
  if proven necessary by real use.
- Roadmap (global phase) view — add only after detail view is good
  enough to navigate into.
- Support for non-GSD coding workflows (superpowers, mattpocock, etc.) —
  considered out of scope until GSD support is polished.
