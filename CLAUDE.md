# ui-app-template

A starter template: Vite + React + TypeScript + Tailwind + shadcn/ui +
TanStack Router/Form/Query + zod, in Feature-Sliced Design, with a design
system, a protobuf/ConnectRPC data layer, and structured logging.

Full conventions live in [`docs/`](docs/). This file is the short version —
the rules that are non-obvious, and the reason each one exists.

## Layout

```
apps/web/              the app — all six FSD layers
packages/design/       shadcn primitives + wrappers, tokens, the form layer
packages/core/         framework infrastructure (NOT an FSD layer)
packages/interfaces/   .proto, buf codegen, generated types
e2e/                   Playwright
```

## Commands

```sh
pnpm dev                 # dev server
pnpm check               # Biome, with fixes
pnpm type:check          # tsc --noEmit, every package
pnpm fsd:check           # steiger — FSD layer boundaries
pnpm test                # vitest
pnpm test:scenario       # scenario tests only
pnpm e2e                 # Playwright against a production build
pnpm gen:proto           # regenerate protobuf types
pnpm ui:add <name>       # install a shadcn component
pnpm rename:scope @acme  # rebrand @template/* to your own scope
```

Before pushing: `pnpm check && pnpm type:check && pnpm fsd:check && pnpm test`.
The git hooks run the fast half on commit and the slow half on push.

## Non-obvious rules

**Dependencies flow downward only.** `app → widgets → pages → features →
entities → shared`. Cross-slice imports go through the slice's `index.ts`, and
a new file gets its barrel export in the same change. This is enforced by
`pnpm fsd:check`, not by review.

**A lower layer never reaches up — it gets things injected.** The worked
example is `shared/api/transport.ts`: it needs to know how to sign out and what
is mocked, both of which `app` owns, so it is built lazily and `app` calls
`configureTransport()` at startup.

**Named exports only.** No default exports.

**Naming is kebab-case.** Screens are `<name>.page.tsx` / `<name>.content.ts` /
`<name>.scenario.test.ts` in `pages/<name>/`.

**`.tsx` renders; `.ts` decides.** A scenario test never renders, so any
decision it asserts must live in a `.ts`. A ternary inside an `onChange` is
unreachable to a test and has to be extracted first. See
[docs/page-triad.md](docs/page-triad.md).

**State has three homes**, plus the URL: server data → TanStack Query (never
mirrored); cross-cutting client state → a zustand store; a continuously-tracked
external value → a module-scope source read through `useSyncExternalStore`.
Filters and pagination go in zod-validated search params. Everything else stays
in `useState` until a second consumer appears.

**Mutations report both outcomes at the call site.** Mutation hooks are
transport-only — no toast, no invalidation, no `catch`. There is deliberately no
global `MutationCache.onError`. The sequence is *clear server errors → validate
→ mutate → invalidate → toast → close*, and the toast's tone comes from
`isDefiniteFailure()`, which separates "the server refused" from "the answer was
lost". See [docs/ux/mutations.md](docs/ux/mutations.md).

**Every data-driven surface handles seven states.** Loading / empty-yet /
empty-filtered / error-with-retry / refetching / mutating / failure. See
[docs/ux/states.md](docs/ux/states.md).

**No `console`.** Biome errors on it. Use `createScopedLogger(scope)` from
`@template/core/logger`; `@heojeongbo/log-palette` may only be imported inside
that one module. See [docs/logging.md](docs/logging.md).

**No copy in `packages/core` or `packages/design`.** A shared component takes a
`<Name>Copy` prop. See [docs/ux/copy.md](docs/ux/copy.md).

**Styling is Tailwind v4 + `cn()`.** A recurring per-page tweak is a new `cva`
variant, not a `className` at the call site. `ui/primitive/` is CLI-owned and
never hand-edited. See [docs/design-system.md](docs/design-system.md).

**An alias must appear in three places together** — package `exports`, tsconfig
`paths`, Vite `resolve.alias`. A mismatch resolves in Vite and fails in `tsc`,
so the dev server stays green while CI goes red.

**A non-obvious choice carries a comment naming the failure it prevents.** Not
what the code does — what goes wrong without it. Those comments are most of
what this template is.

## Traps that have already bitten

- `z.coerce.boolean()` reads `"false"` and `"0"` as **true**. Use
  `z.stringbool()` / `boolParam()`.
- `Timestamp.seconds` is a **bigint**; the arithmetic throws. Use `toDate` /
  `toMillis` from `@template/core/proto`.
- Vite matches `resolve.alias` by **prefix, in order** — a bare `"@"` listed
  first also matches `"@template/core"`.
- `<form.AppForm>` is **required** around `form.Root` / `form.SubmitButton`, or
  the button never disables and nothing warns.
- `shadcn add` appends a `cssVars` block to the **bottom** of `style.css`,
  overriding the oklch tokens. Delete it.
- The router's `autoCodeSplitting` breaks under Vitest; it is off when
  `VITEST` is set.
- TypeScript 7 removed `baseUrl`, and cosmiconfig's TS loader does not work
  with it (hence `steiger.config.js`, not `.ts`).

## Before you commit

1. `pnpm check` — Biome
2. `pnpm type:check` — every package
3. `pnpm fsd:check` — layer boundaries
4. `pnpm test` — unit + scenario
5. If you touched a screen: does its spec in `apps/web/docs/screens/` still
   match, and does every `S<n>` still have exactly one test?
6. If you touched `packages/design/src/ui/`: did you audit the consumers?
