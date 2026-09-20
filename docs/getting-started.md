# Making it yours

The template ships a working demo — a sign-in screen and an `items` CRUD — so
that every convention has something real to point at. Your first job is to
replace the demo, not to read all of it.

Roughly an hour, in this order.

## 1. Rename the scope

```sh
pnpm rename:scope @acme my-app
pnpm install
pnpm type:check
```

`@template/*` appears in package names, `exports` maps, tsconfig `paths`, Vite
aliases, `components.json` and the docs — eight places that must agree or the
build fails in the confusing way (resolves in Vite, not in `tsc`). The script
does all of them; `--dry` shows what it would change.

## 2. Boot it once, before changing anything

```sh
cp apps/web/.env.example apps/web/.env.local   # set VITE_ENABLE_MOCKS=true
pnpm dev
```

Click through sign-in → items → filter → create → delete → undo. That is the
whole convention set in one loop, and it is much faster to read the code
afterwards knowing what it produced.

Then run the gate once so you know what green looks like:

```sh
pnpm check && pnpm type:check && pnpm fsd:check && pnpm test
```

## 3. Replace the contract

`packages/interfaces/proto/example/v1/item.proto` is the sample. Replace the
package name and the messages with yours:

```sh
# edit packages/interfaces/proto/…
pnpm gen:proto
```

Then update `packages/interfaces/src/proto.ts` to export your namespace.
Everything downstream — `proto.example_v1.*` — moves with it, which is the
whole reason that file exists.

**No backend yet?** Keep the mocks. `src/app/mocks/item.mock.ts` is a working
model of how to write one that behaves like a server rather than a stub:
filter, paginate, enforce the constraints your schema declares, and reject with
the `Code`s a real backend would. Building the UI against that is what makes it
correct on the day the server arrives.

**Not using protobuf at all?** Delete `packages/interfaces`, drop it from
`pnpm-workspace.yaml` and the tsconfig paths, and replace `shared/api/client.ts`
with whatever client you do use. Nothing else in `shared/` or `entities/`
assumes Connect — they assume *a client resolved lazily inside the request*,
which is the part worth keeping.

## 4. Replace the demo screens

Delete, in this order:

```
apps/web/src/pages/items/
apps/web/src/features/item-editor/
apps/web/src/entities/item/
apps/web/src/routes/(auth)/(shell)/items/
apps/web/src/app/mocks/item.*
apps/web/docs/screens/item*.md
e2e/tests/items.spec.ts
```

Keep `pages/signin/` and `entities/session/` — wire them to your real auth (the
sign-in submit is a `setTimeout` stand-in; replace it with a mutation) — and
keep everything in `shared/`.

`pnpm fsd:check` will tell you if you left a dangling import.

## 5. Add your first screen

Spec first. It is five headings and ten minutes, and it is what makes the
scenario tests writable:

1. `apps/web/docs/screens/<name>.md` — Purpose / States / Scenarios / Data /
   Not covered. Number the scenarios.
2. A `describe` block with `it.todo` per scenario in
   `src/pages/pending-screens.scenario.test.ts`. That file imports nothing, so
   the spec can be reviewed before any code exists.
3. `src/pages/<name>/` — `<name>.page.tsx`, `<name>.content.ts`, a pure
   decision module, `index.ts`.
4. Move the scenario block to `<name>.scenario.test.ts` and implement it,
   keeping the numbers.
5. A thin route under `src/routes/`: path, zod search, guard, loader,
   `component`.

`apps/web/docs/screens/items.md` and `pages/items/` are the worked example of
every step. [page-triad.md](page-triad.md) explains the rule that makes it hold.

## 6. Make it look like yours

**One file: `apps/web/src/app/theme.css`.** Every token is in there, commented
out, showing its default, for light and dark both. Uncomment what you want and
change it:

```css
:root { --primary: oklch(0.55 0.22 260); }
.dark { --primary: oklch(0.75 0.18 260); }
```

It is imported after the design system, so it wins on the cascade — which means
you never edit `packages/design` and a template update never conflicts with
your colours. Set both modes; a token defined only for light leaks into dark.

Start with `--primary` and `--primary-foreground`. Those two carry every filled
button, active nav item and focus accent, and changing them alone already makes
the app look like a different product.

For a palette that arrives at runtime — a tenant's brand — see
`injectThemeTokens` in [design-system.md](design-system.md#runtime--injectthemetokens).

Font: set `--font-sans` in `inline.css`'s `@theme` block, and ship the file in
`apps/web/public/`. Set it on the theme, not on `body`, or the `font-sans`
utility and the actual body font disagree.

Add components with `pnpm ui:add <name>` — then **check the bottom of
`style.css`** and delete any injected `cssVars` block. See
[design-system.md](design-system.md).

## 7. Decide about the optional pieces

| Piece | Keep it if | Remove with |
| --- | --- | --- |
| **calque** (offline/IndexedDB) | You need reads served locally and reconciled. Costs a Go toolchain. | `packages/interfaces/calque/README.md` has the exact steps |
| **Playwright** | Almost always. It caught two real bugs building this. | `rm -rf e2e`, drop it from `pnpm-workspace.yaml` and CI |
| **The runtime-config mechanism** | You deploy one image to several environments. | `rm -rf docker public/config.js`, drop the script tag from `index.html` |
| **i18n** | Not wired up — the `*.content.ts` separation it needs is already here. [i18n.md](i18n.md) has the steps. | — |

## 8. Read these two

Everything else can wait until you hit it.

- [ux/mutations.md](ux/mutations.md) — the write contract. The single most
  load-bearing document here, and the one whose absence produces the most
  user-visible bugs.
- [architecture.md](architecture.md) — the layers, and the rule that a lower
  layer never reaches up.

## What to keep even if you change everything else

The parts that are not about this demo:

- The **layer boundaries**, and the fact that `pnpm fsd:check` enforces them
  rather than review.
- The **error taxonomy** — "the server refused" versus "the answer was lost".
  Most of the mutation UX derives from that one distinction.
- The **seven async states** checklist.
- **`.tsx` renders, `.ts` decides**, enforced by scenario tests that never
  render.
- The habit of commenting a non-obvious choice **with the failure it
  prevents**. That is most of what makes this readable a year from now.
