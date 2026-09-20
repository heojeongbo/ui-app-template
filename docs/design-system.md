# Design system

`packages/design` — shadcn primitives, the wrappers around them, the token
layer, and the TanStack Form field set.

## Two layers, split by ownership

```
src/ui/primitive/button.tsx   installed by the CLI. Never hand-edited.
src/ui/button/button.tsx      ours. Edited freely.
src/ui/button/index.ts        the only path anything else imports.
```

The split is by **ownership**, not by how shadcn-ish a file looks. That is what
makes it decidable in review, and what lets all of `primitive/` be regenerated
without anyone reconstructing which lines were ours. Editing an installed file
in place is the failure this prevents: the edit survives until the next upgrade
silently discards it.

**Everything goes through the wrapper, including untouched components.** An
untouched primitive gets a one-line `index.ts` re-exporting it. That costs
nothing — `ui:add` writes it — and buys two things: `ui/`'s folder listing is an
accurate inventory of what the design system offers, and the day a component
*does* need customising, no call site moves.

Lint is **off** for `primitive/`; formatting is **on**. Fixing upstream's lint
findings by hand is work the next `--overwrite` throws away, but tabs and double
quotes are a mechanical rewrite the CLI has no opinion about.

## Adding a component

```sh
pnpm ui:add tooltip
```

Five steps, because `shadcn add` only does the first:

1. install → `ui/primitive/tooltip.tsx`
2. **normalise imports** — the CLI emits `import { cn } from "cn"` (the
   standalone package) and ignores the `utils` alias that is still in
   components.json's schema. We point it back at `lib/utils` so there is one
   import path for class merging across both layers.
3. scaffold `ui/tooltip/index.ts`
4. regenerate `ui/index.ts` (`pnpm ui:sync` — never hand-edit it)
5. format

`--overwrite` is passed **by default**, and the two-layer split is what makes
it safe. Without it the CLI prompts whenever a component pulls in one that
already exists (`alert-dialog` needs `button`), and under `--yes` that prompt
makes the whole install bail silently — the requested component never lands.

### After installing: check the bottom of `style.css`

A component that ships `cssVars` gets its palette appended **to the bottom of
that file, in HSL, after the imports** — so it overrides the oklch tokens and
pulls the component off-palette. (`sidebar` is the usual offender; its focus
ring arrives blue.) The tokens it wants are already defined. Delete the
injected block; `style.css` carries a comment marking where it lands.

If a component needs a token that does **not** exist yet, add it to
`light.css`, `dark.css` and `inline.css` first.

## Tokens

Four files, so rebranding means editing two of them:

| File | Holds |
| --- | --- |
| `style.css` | Entry: imports, `@custom-variant dark`, `@source`, base layer |
| `inline.css` | `@theme inline` — which utilities exist |
| `light.css` | The light palette |
| `dark.css` | The dark palette |

`@custom-variant dark (&:is(.dark *))` is **load-bearing**. Without it Tailwind
compiles `dark:` to a `prefers-color-scheme` media query while the tokens
switch on the `.dark` class — so a user on a light OS who toggles the app to
dark gets dark tokens and light utility overrides. Both halves must key off the
same signal.

`@theme inline`, not a bare `@theme`: it resolves the variable at use-site
instead of emitting a second layer of custom properties into `:root`, so the
`.dark` override actually wins. This is what shadcn's own v4 docs prescribe.

`--font-sans` is set **on the theme**, not on `body`. A `body { font-family }`
rule leaves the `font-sans` utility resolving to Tailwind's default stack, and
the two then disagree wherever the utility is used explicitly.

Four semantic tones — `success`, `info`, `warning`, `danger` — each a triple of
solid / foreground / surface. `--destructive` is aliased to `--danger`: the
colour of a destructive action and the colour of a failure are one thing, and
two literals drift the first time either is tuned.

`@source` paths are relative to the declaring stylesheet, and each consuming
app adds its own. Moving a stylesheet breaks Tailwind's scanning with **no
error** — only classes that silently never get emitted.

## Component discipline

A change under `src/ui/` hits every consumer. Treat each component as a
contract.

1. **Audit consumers first.** `rg "<Button\b" apps packages --glob '!**/node_modules/**'`
2. **Variant beats override.** A recurring per-page tweak is a new `cva`
   variant, not a `className` at the call site. An override hides the rule from
   everyone else; the third time you write the same conditional, extract it.
3. **`cn()` is the only class-composition path.** `clsx` resolves conditionals;
   `tailwind-merge` makes a later class actually beat an earlier one in the same
   group. A plain template string gets the first half and not the second, which
   is why an appended `className` silently loses to the component's default.
4. **No copy in this package.** A component that needs words takes a
   `<Name>Copy` prop. See [ux/copy.md](ux/copy.md).
5. **Keep `data-slot`.** It is upstream convention and is used for
   cross-component styling; losing it breaks selectors when a component is
   later replaced by the CLI.

## Owned outright

Some components have no primitive counterpart, either because we wrote them or
because taking upstream's version would have cost more than owning it:

- **`ui/sonner`** — shadcn's version calls `useTheme()` from `next-themes`.
  Taking it means either adding a theme library this template does not use, or
  shipping the bug it causes when nobody mounts its provider: the hook falls
  back to `"system"` forever, so the toaster ignores the app's theme toggle.
  Ours takes `theme` as a **prop**; the design system has no opinion about
  where the app keeps it.
- **`ui/form/*`** — TanStack Form, not react-hook-form. **Do not
  `ui:add form`**: shadcn's is react-hook-form-based, and two form libraries in
  one workspace means every schema, resolver and field component exists twice.

## The form layer

```tsx
<form.AppForm>
  <form.Root onSubmit={() => form.handleSubmit()}>
    <form.AppField name="name">
      {(field) => <field.InputWithLabel label="Name" />}
    </form.AppField>
    <form.SubmitButton>Save</form.SubmitButton>
  </form.Root>
</form.AppForm>
```

**`<form.AppForm>` is required** around anything from `formComponents`. It
supplies the context `SubmitButton` reads to disable itself while submitting —
without it the button renders, never disables, and nothing warns.

zod schemas go straight into `validators`; TanStack Form v1 speaks Standard
Schema natively. **Do not install `@tanstack/zod-form-adapter`** — abandoned at
0.42.1, pre-v1.

Adding a field is mechanical: write `form.<name>.tsx` exporting `Form<Name>`
(and `Form<Name>WithLabel` where a caption makes sense) that calls
`useFormField()` and renders `<FormFieldError />`, then register it in
`form.ts`. Labelled variants compose `FormFieldLayout` so orientation, label
association and error placement stay identical across the set.

`useFormField()` derives the accessibility wiring once, and it is the part most
form layers get wrong:

- **`id` is namespaced with `useId()`**, not the bare field name. Two forms can
  be mounted at once — a dialog over a page form — and duplicate ids point every
  label at the first match.
- **`aria-invalid` is `true` or absent**, never `"false"`. Tailwind's
  `aria-invalid:` variant matches `[aria-invalid="true"]`.
- **`aria-describedby` links the control to its error node.** Red text is not
  an announcement.
- **`onBlur` calls `field.handleBlur`.** Without it `validators.onBlur` is
  configured and silently dead.

Server errors: `applyServerFieldErrors` / `clearServerFieldErrors`. See
[ux/mutations.md](ux/mutations.md).

## No Storybook

Deliberately. shadcn's primitives are documented upstream, and the rules that
actually matter here are written down rather than demonstrated. If you add one,
the rule that comes with it is: a variant change without a story update is an
incomplete change.
