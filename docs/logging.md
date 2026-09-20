# Logging

`@heojeongbo/log-palette`, behind one module.

## Use it

```ts
import { createScopedLogger } from "@template/core/logger"

const log = createScopedLogger("Api")

log.info("items loaded", { count: items.length, ms })
log.error("create failed", error)
log.lazy("debug", "cache reconciled", () => ({ keys: [...cache.keys()] }))
```

## Scopes

A closed union — `"App" | "Api" | "Auth" | "Router" | "Query" | "Form" |
"Store"` — not free-form strings. A union stops names drifting (`"Api"` vs
`"API"` vs `"api"` would be three colours for one subsystem), makes `grep`
reliable, and keeps every badge within `innerWidth` so the column never
jitters. Add a scope when you add a subsystem; keep it ≤ 8 characters.

## Levels

`debug < log < info < warn < error`. The level is applied once, at the entry
point:

```ts
initLogging({ level: resolveLogLevel() })   // first statement of main.tsx
```

Production defaults to **`warn`**, not silence. log-palette's README suggests
`disableAll()` in production; that takes `warn` and `error` with it, which are
the only signal a support engineer gets from a user's console.

Override with `VITE_LOG_LEVEL`. In a dev build, `__log.setLevel("debug")` from
the DevTools console works too — which beats redeploying with a changed
constant.

## `lazy`

The level check happens *inside* the emit, so arguments are evaluated even when
the line is dropped:

```ts
log.debug("state", serialiseEverything(x))   // pays full cost in production
log.lazy("debug", "state", () => serialiseEverything(x))   // does not
```

Anything more expensive than passing a reference belongs in `lazy`. That
includes `protoJson(Schema, msg)`, which is the only way to log a protobuf
message readably — passing one directly prints internal symbols, and
`JSON.stringify` throws outright on its bigint fields.

## Why it is wrapped

Nothing outside `packages/core/src/logger/` may import
`@heojeongbo/log-palette`. A Biome `noRestrictedImports` rule enforces it, and
the carve-out lives in `packages/core/biome.jsonc` — a nested Biome config
resolves the root's override globs relative to itself, so a root-anchored path
would silently match nothing.

Three reasons the indirection earns its keep, all verified against 0.2.2:

1. **`configure()` is read at LOG time**, not at logger-creation time. A logger
   created outside this module's import graph renders at a different prefix
   width, so the badge column stops lining up. One module makes that impossible
   rather than merely discouraged.
2. **Only `getLogger()` instances enter the registry.** `createLogger()` looks
   equivalent, but `setGlobalLevel` / `enableAll` / `disableAll` iterate the
   registry only — an app built on `createLogger` has no runtime control over
   its own logging at all.
3. **It is pre-1.0 with no transports, no sinks and no child loggers.** Adding
   a remote sink, or replacing it, is a change to one file.

## `console` is banned

Biome's `suspicious/noConsole` is an **error**, with exactly three carve-outs:
the logger module itself, `scripts/**`, and `*.config.ts` — places where stdout
is the user interface.

A greenfield repo has no migration cost, which is the whole reason to turn this
on at commit one rather than accumulating four hundred call sites and then
wishing you had.

## Message convention

```
log.<level>("<subject> <outcome>", { fields }, error?)
```

- The subject is the real name — an RPC, a route, a key. Not a category.
- **Never re-prefix with the scope.** The coloured badge already says it.
- Structured data in **one object argument**, never interpolated into the
  string. DevTools renders an object expandable; a string is a wall.
- Elapsed time as an integer field `ms`.
- **The error goes last, raw and unstringified**, so DevTools keeps the stack.

## Logging is not user-facing error handling

Three separate layers, and conflating them is how a user ends up watching a
spinner while the console knows exactly what went wrong:

1. The transport interceptor **logs** every RPC rejection and returns the call
   unchanged.
2. Render errors reach an error boundary, whose `onError` is the single
   reporting seam — plug Sentry in there. The template ships no reporting SDK.
3. Telling the **user** is an explicit `toast` at the call site. See
   [ux/mutations.md](ux/mutations.md).
