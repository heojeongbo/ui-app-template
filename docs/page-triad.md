# The page triad

Every screen is a folder under `apps/web/src/pages/`:

```
pages/items/
  items.page.tsx            renders — a pure function of props and hooks
  items.content.ts          says — every string this screen shows
  items.filters.ts          decides — the pure functions the scenarios assert
  items.scenario.test.ts    asserts — one `it` per S<n> in the spec
  index.ts                  the slice's public API
  items.table.tsx           private subcomponents
  items.filter-bar.tsx
```

## Start one with `pnpm new:screen`

```sh
pnpm new:screen reports
```

It writes the page, the content module, the barrel, a spec under
`apps/web/docs/screens/` with its five fixed headings, and a matching `it.todo`
placeholder — so `pnpm scenario:check` is green before you have written
anything, and stays green only while you keep the spec and its tests in step.

Not generated: **the route**. Routing is file-based, so which layout group and
which guard a screen sits behind is a real decision, and a wrong generated
route is worse than an absent one. See [routing.md](routing.md).

The command exists because this template proved the need: its own `home`
screen shipped without a content module or a spec, under a docblock that
described both. A convention you have to remember is a convention that decays.

## The rule that makes it hold

**Scenario tests never render.**

The consequence is a constraint on how screens are written: *any decision a
scenario asserts must live in a `.ts`, not inside a `.tsx` handler.* A filter
reset written as a ternary inside an `onChange` is unreachable to a scenario
and has to be extracted before it can be covered — so it gets extracted first.

That is single responsibility expressed as something a test can fail on, rather
than as advice. `items.filters.ts` is seven exported functions, one per
scenario in `apps/web/docs/screens/items.md`, and `items.page.tsx` consequently
contains no branching of its own.

## The parts

**`*.page.tsx`** — reads route state, calls hooks, renders. Its handlers are
one-line calls into the decision module. If one grows a `?:`, move it out.

**`*.content.ts`** — every user-facing string, typed. See
[ux/copy.md](ux/copy.md).

**`*.filters.ts`** (or `*.rules.ts`, `*.transitions.ts` — name it for what it
decides) — pure functions. No React, no I/O.

**`*.scenario.test.ts`** — one `it("S<n>: …")` per scenario, same numbers and
sentences as the spec. Comment each assertion with the bug it prevents.

Rendering tests are welcome — they are just not scenarios. Put them in
`*.test.tsx` and let them cover markup and accessibility, which is what
rendering is good at.

## The spec

Screens are specified before they are built, in
`apps/web/docs/screens/<name>.md`, using five fixed headings: Purpose, States,
Scenarios, Data, Not covered. **Every `S<n>` has exactly one test.**

A screen that does not exist yet gets a `describe` block with `it.todo` in
`src/pages/pending-screens.scenario.test.ts`. That file imports nothing, so a
screen can be specified and agreed before a line of it exists without being
able to break the build.

`pnpm test:scenario` is literally `vitest run scenario` — a filename filter.

Full convention: `apps/web/docs/screens/README.md`.

## Why flat, not segmented

Steiger's `no-segmentless-slices` wants `pages/items/ui/`, `pages/items/model/`.
This template keeps a screen flat, and `steiger.config.js` turns the rule off
with the reason: the dot-prefix already says what each file is, the folder
listing reads as one screen rather than four folders holding one file each, and
the scenario test sits beside the module it tests.

A slice that genuinely outgrows a screen's worth of code should be split — but
by then it is usually a feature, not a page.

## Routes stay thin

A route file owns the URL contract and nothing else: path, zod search schema,
guard, loader, `component`. The screen lives in `pages/`.

Pages read route state through `getRouteApi("/path")` rather than importing the
Route object. The route imports the page; the page importing the route back
would be a cycle. `getRouteApi` resolves by path at call time and keeps the
arrow pointing one way.
