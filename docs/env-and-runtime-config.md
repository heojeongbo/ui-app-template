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

## What ships it

`Dockerfile` + `docker/entrypoint.sh`. nginx runs everything in
`/docker-entrypoint.d` before starting, so the rewrite needs no `CMD` of its
own:

```sh
docker build -t my-app .
docker run -e APP_API_BASE_URL=https://api.example.com -p 8080:80 my-app
```

The entrypoint emits **only keys that are actually set**. A key
present-but-empty would override the build-time default with an empty string,
which is worse than absent — `readRuntimeConfig` treats absent as "fall back"
and empty as a value.

`docker/nginx.conf` does two things beyond serving files: an SPA fallback, so a
hard refresh on any route reaches `index.html` instead of nginx's own 404; and
`no-store` on `index.html` and `config.js`, because a cached copy of either
pins the browser to a previous deployment. Hashed assets are immutable and
cached forever.

## Which to use

| Question | Answer |
| --- | --- |
| Does it differ between dev and production builds? | `.env` |
| Does it differ between deployments of the **same** image? | `config.js` |
| Is it a secret? | Neither. Both ship to the browser. |
