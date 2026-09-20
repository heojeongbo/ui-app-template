## What and why

<!-- What changed, and the problem it solves. If a non-obvious choice was made,
     name the failure it prevents — that is the house style. -->

## Checks

- [ ] `pnpm check` — Biome
- [ ] `pnpm type:check` — every package
- [ ] `pnpm fsd:check` — FSD layer boundaries
- [ ] `pnpm test` — unit + scenario
- [ ] `pnpm e2e` — if routing, a form, or a mutation flow changed

## If this touches a data-driven surface

The seven states (docs/ux/states.md) — tick what applies, strike what does not:

- [ ] Loading — a skeleton whose layout mirrors the real content
- [ ] Empty, nothing yet — with the action that creates the first one
- [ ] Empty, nothing matches — different wording, different action
- [ ] Error — with a retry
- [ ] Refetching — visible, without collapsing what is on screen
- [ ] Mutating — the acting control shows it; its peers disable
- [ ] Failure — right toast tone, nothing destroyed, input kept

## If this adds or changes a mutation

- [ ] Both outcomes are reported, at the call site
- [ ] Invalidation is **awaited before** the toast
- [ ] Tone comes from `isDefiniteFailure()`, not a guess
- [ ] Field-level server errors land on their fields; `unmatched` is surfaced
- [ ] The dialog closes only on success; input survives a failure
- [ ] Destructive? It confirms, and offers undo where the data allows it

## If this touches a screen

- [ ] Its spec in `apps/web/docs/screens/` still matches
- [ ] Every `S<n>` still has exactly one test

## If this touches `packages/design/src/ui/`

- [ ] Consumers audited (`rg "<ComponentName\b" apps packages`)
- [ ] A recurring tweak became a `cva` variant, not a call-site `className`

## Anything suppressed?

<!-- A biome-ignore or a steiger rule turned off needs a written reason here and
     in the code. "It was failing" is not one. -->
