# vigil

A quiet, file-watched dashboard for coding-agent workflows that write
durable state to disk. Opens in the morning and remembers in 30 seconds
where you left off.

## Install

    npm install -g vigil

## Run

    vigil                       # auto-discover .planning/ from cwd
    vigil ~/project/foo         # explicit path

Then open <http://localhost:7171>.

## Override the editor

By default, *open in editor* uses the `vscode://` URL scheme (Cursor /
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
