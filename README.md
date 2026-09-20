# ui-app-template

A starter template for UI apps: **Vite + React + TypeScript + Tailwind +
shadcn/ui + TanStack Router/Form/Query + zod**, laid out in
[Feature-Sliced Design][fsd], with a design system, a protobuf/ConnectRPC data
layer, and structured logging.

Its value is the encoded conventions as much as the code — layer boundaries
that are actually enforced, a mutation→toast contract, an async-state
checklist, and a spec→test→screen loop.

## Quick start

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then set VITE_ENABLE_MOCKS=true
pnpm dev
```

The app runs with no backend: `VITE_ENABLE_MOCKS=true` makes it answer its own
RPCs from an in-memory service that filters, paginates and rejects the way a
real one would.

Then make it yours:

```sh
pnpm rename:scope @acme my-app
```

That rewrites `@template/*` across package names, `exports` maps, tsconfig
paths, Vite aliases, `components.json` and the docs — the eight places that
must agree or the build fails in the confusing way.

**[docs/getting-started.md](docs/getting-started.md) walks the rest**: replacing
the sample contract, deleting the demo screens, adding your first one, and
which optional pieces to keep.

## What's in it

| | |
| --- | --- |
| **Routing** | File-based TanStack Router with route-level code splitting, zod-validated search params, `beforeLoad` guards, loaders that prime the query cache, and route-level pending/error/404 |
| **Data** | TanStack Query with one client and a key hierarchy per entity; ConnectRPC over protobuf; an error taxonomy that separates "the server refused" from "the answer was lost" |
| **Forms** | TanStack Form + zod, with the accessibility wiring derived once and server errors mapped back onto fields |
| **Design system** | Tailwind v4, oklch tokens, shadcn primitives behind a two-layer ownership split so `shadcn add --overwrite` stays non-destructive |
| **Logging** | `@heojeongbo/log-palette` behind one module, with `console` banned by lint |
| **Testing** | Vitest units, render-free scenario tests, router integration tests, and Playwright against the production bundle |
| **Guardrails** | Biome, steiger (FSD boundaries), real git hooks, CI that also checks generated trees are current |

## Layout

```
apps/web/              the app — all six FSD layers
packages/design/       shadcn primitives + wrappers, tokens, the form layer
packages/core/         framework infrastructure: logger, query, transport, stores, env
packages/interfaces/   .proto, buf codegen, generated types
e2e/                   Playwright
docs/                  the conventions this template encodes
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm check` | Biome — format + lint, with fixes |
| `pnpm type:check` | `tsc --noEmit` in every package |
| `pnpm fsd:check` | Steiger — FSD layer boundaries |
| `pnpm test` | Vitest — unit + scenario |
| `pnpm test:scenario` | Scenario tests only |
| `pnpm e2e` | Playwright against a production build |
| `pnpm gen:proto` | Regenerate protobuf types |
| `pnpm gen:proto:calque` | Tier 2 codegen (needs Go) |
| `pnpm ui:add <name>` | Install or upgrade a shadcn component |
| `pnpm ui:remove <name>` | Remove one — refuses if still imported |
| `pnpm rename:scope @acme` | Rebrand the workspace |

## Documentation

Start with [`docs/getting-started.md`](docs/getting-started.md) to make it
yours, then [`docs/architecture.md`](docs/architecture.md) for how it fits
together. By topic:

- [page-triad](docs/page-triad.md) — how a screen is structured, and the rule
  that makes it hold
- [routing](docs/routing.md) — routes, guards, URL state
- [data-fetching](docs/data-fetching.md) — queries, keys, invalidation
- [ux/mutations](docs/ux/mutations.md) — the write contract, toast tone, undo
- [ux/states](docs/ux/states.md) — the seven async states
- [ux/copy](docs/ux/copy.md) — where strings live and how they read
- [design-system](docs/design-system.md) — tokens, shadcn, component discipline
- [logging](docs/logging.md), [proto-and-transport](docs/proto-and-transport.md),
  [testing](docs/testing.md), [mocking](docs/mocking.md),
  [env-and-runtime-config](docs/env-and-runtime-config.md), [i18n](docs/i18n.md)

`CLAUDE.md` and `AGENTS.md` are the short form, for humans in a hurry and for
coding agents.

## Deploying

One image, every environment:

```sh
docker build -t my-app .
docker run -e APP_API_BASE_URL=https://api.example.com -p 8080:80 my-app
```

The entrypoint rewrites `config.js` at boot, so a build is not pinned to the
backend it was built against — `VITE_*` values are inlined by the bundler and
cannot be changed afterwards. See
[env-and-runtime-config](docs/env-and-runtime-config.md).

## Requirements

- Node >= 22
- pnpm — pinned via `packageManager`; Corepack installs it for you
- Go >= 1.26.3, **only** for the optional calque codegen tier

<!-- Pinned to pnpm 11: pnpm 12 moved its bin entries from `bin/pnpm.cjs` to
     shell shims at the package root, and the Corepack bundled with Node 22/24
     (0.34.x) hardcodes the old path and cannot launch it. Bump once Corepack
     >= 0.36 is what ships with Node LTS. -->

## License

MIT — see [LICENSE](LICENSE).

[fsd]: https://feature-sliced.design/
