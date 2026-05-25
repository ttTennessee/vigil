# parsers/

These functions take strings and return data. They do not read the
filesystem, do not call APIs, do not import anything from `server/` or
`client/`. This rule lets them run unmodified inside Ink, Tauri, wasm —
anywhere a future vigil host might live.

If you find yourself wanting `fs` in here, the answer is no — pass the
already-read string in from the caller.

See [`research/02-architecture-decisions.md`](../../research/02-architecture-decisions.md#d7-parse-exactly-what-you-render)
for D7 ("parse exactly what you render") which this directory enforces.
