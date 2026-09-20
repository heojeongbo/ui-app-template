# Agent contract

Read [`CLAUDE.md`](CLAUDE.md) first — it holds the rules. This file is what an
agent has to *do*.

## Before changing anything

1. Read `CLAUDE.md` and the doc for the area you are touching
   ([`docs/`](docs/)).
2. If you are changing a screen, read its spec in `apps/web/docs/screens/`.
3. If you are changing `packages/design/src/ui/`, audit the consumers first:
   `rg "<ComponentName\b" apps packages --glob '!**/node_modules/**'`.

## The gate — run all of it before reporting done

```sh
pnpm check        # Biome, with fixes
pnpm type:check   # every package
pnpm fsd:check    # FSD layer boundaries
pnpm test         # unit + scenario
```

Add `pnpm e2e` when you changed routing, a form, or a mutation flow.

**Do not report success on a partial run.** If a step fails and you cannot fix
it, say which step, paste the output, and say what you tried.

## Adding a screen

1. Write the spec: `apps/web/docs/screens/<name>.md`, five headings, numbered
   scenarios. See `apps/web/docs/screens/README.md`.
2. Add `describe`/`it.todo` blocks to `src/pages/pending-screens.scenario.test.ts`.
3. Build `src/pages/<name>/` — `.page.tsx`, `.content.ts`, a pure decision
   module, `index.ts`.
4. Move the scenario block into `<name>.scenario.test.ts` and implement it,
   keeping the numbers.
5. Add the route under `src/routes/`, thin: path, zod search, guard, loader,
   `component`.

## Adding a mutation

1. A transport-only hook in `entities/<x>/api/<x>.mutations.ts`. No toast, no
   invalidation, no `catch`.
2. At the call site: clear server errors → validate → mutate → **await**
   invalidate → toast → close.
3. Tone from `isDefiniteFailure()`. Field-level errors onto their fields;
   surface `unmatched`.
4. Destructive? Confirm, and offer undo if the data allows it.
5. Walk [`docs/ux/mutations.md`](docs/ux/mutations.md)'s checklist.

## Adding a UI component

1. `pnpm ui:add <name>` if shadcn has one.
2. **Check the bottom of `packages/design/src/style/style.css`** and delete any
   injected `cssVars` block.
3. Customise in `ui/<name>/<name>.tsx`, never in `ui/primitive/`.
4. A recurring tweak is a `cva` variant, not a call-site `className`.

Removing one is `pnpm ui:remove <name>`, which refuses while anything still
imports it. Never `rm -rf` a component folder by hand.

## Things not to do

- Do not add a global mutation-error toast.
- Do not put copy in `packages/core` or `packages/design`.
- Do not use `console`, or import `@heojeongbo/log-palette` outside
  `packages/core/src/logger/`.
- Do not edit `ui/primitive/`, `src/gen/`, `routeTree.gen.ts`, or
  `src/ui/index.ts` by hand.
- Do not silence a lint or a boundary rule to make a change pass. Both
  exceptions in `steiger.config.js` carry a written reason; meet that standard
  or fix the code.
- Do not add a dependency without saying in the commit message what it replaces
  and why the alternative was worse.

## Writing code here

**Comment the non-obvious with the failure it prevents**, not with what the
code does. That is the house style, and it is most of what this template is
worth. If a line has no failure mode worth naming, it needs no comment.

## Commits

Conventional Commits; `commitlint` enforces it on `commit-msg`. The body should
say *why*, and name the bug a non-obvious choice prevents.
