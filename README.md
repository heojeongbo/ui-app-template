# ui-app-template

A starter template for UI apps: **Vite + React + TypeScript + Tailwind + shadcn/ui +
TanStack Router/Form/Query + zod**, laid out in [Feature-Sliced Design][fsd], with a design
system, a protobuf/ConnectRPC data layer, and structured logging.

Its value is the encoded conventions as much as the code — layer boundaries, the
mutation→toast contract, the async-state checklist, and a spec→test→screen loop.

> Work in progress. See [`docs/`](docs/) as it fills in.

## Quick start

```sh
pnpm install
pnpm dev
```

## Layout

```
apps/web/          the app — all six FSD layers
packages/design/   shadcn primitives + wrappers, design tokens, the TanStack Form layer
packages/core/     framework infrastructure: logger, query client, transport, stores, env
packages/interfaces/  .proto sources, buf codegen, generated types
e2e/               Playwright
docs/              the conventions this template encodes
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm check` | Biome — format + lint, with fixes |
| `pnpm lint` | Biome, read-only |
| `pnpm type:check` | `tsc -b` across every package |
| `pnpm fsd:check` | Steiger — FSD layer boundaries |
| `pnpm test` | Vitest |
| `pnpm test:scenario` | Scenario tests only |
| `pnpm e2e` | Playwright |
| `pnpm gen:proto` | Regenerate protobuf types |
| `pnpm ui:add <name>` | Install a shadcn component |
| `pnpm rename:scope @acme` | Rebrand `@template/*` to your own scope |

## Requirements

- Node >= 22
- pnpm — pinned via `packageManager`; Corepack installs it for you.

<!-- Pinned to pnpm 11: pnpm 12 moved its bin entries from `bin/pnpm.cjs` to shell
     shims at the package root, and the Corepack bundled with Node 22/24 (0.34.x)
     hardcodes the old path and cannot launch it. Bump once Corepack >= 0.36 is
     what ships with Node LTS. -->

[fsd]: https://feature-sliced.design/
