# Environment and runtime config

Two mechanisms, for two different questions.

## Build-time: `.env` → `import.meta.env`

Parsed by zod **at module load** in `packages/core/src/config/env.ts`.

Reading `import.meta.env.VITE_X` raw has two failure modes this replaces: a
missing variable is `undefined`, so the app boots and fails somewhere far away
("Cannot read properties of undefined"); and everything is `string | undefined`,
so every call site re-does its own coercion and two of them disagree about what
`"false"` means.

Parsing at load turns both into **one legible error at startup**, naming the
variable.

```ts
VITE_ENABLE_MOCKS: z.stringbool().optional()
```

`z.stringbool()`, never `z.coerce.boolean()` — the latter applies JavaScript
truthiness, under which `"false"` and `"0"` are both `true`. That is how a debug
flag ships enabled in production.

Copy `.env.example` to `.env.local` for local overrides.

## Run-time: `public/config.js` → `window.__APP_CONFIG__`

`VITE_*` values are **inlined by the bundler**. A container image built for
staging is permanently a staging image — the opposite of what an image is for.

The fix is an ordinary script tag that runs before the app bundle:

```html
<!-- index.html, BEFORE the module script -->
<script src="/config.js"></script>
```

```js
// public/config.js — rewritten by the container entrypoint at boot
window.__APP_CONFIG__ = { apiBaseUrl: "https://api.example.com" }
```

A **classic** script, not a module: it must have executed before the app's first
import runs, and a module would be deferred.

`readRuntimeConfig()` validates it and **ignores a malformed config rather than
refusing to boot**, reporting the problem instead. It arrives from a file
someone edits by hand during a deploy, and failing the whole app over a stray
value is worse than falling back to the build-time default and saying so.

Precedence is **runtime > build-time**: the runtime value is the one someone set
on purpose for this deployment.

## Which to use

| Question | Answer |
| --- | --- |
| Does it differ between dev and production builds? | `.env` |
| Does it differ between deployments of the **same** image? | `config.js` |
| Is it a secret? | Neither. Both ship to the browser. |
