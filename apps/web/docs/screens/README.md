# Screen specs

A screen is specified here before it is built, and every scenario in a spec is
covered by a test that names it. `pnpm scenario:check` enforces both halves.

## The template

Five fixed headings. They are fixed so a reader can skim to the one they need,
and so a spec that is missing a section is visibly missing it.

```markdown
# <Screen name>

## Purpose
What this screen is for, in a sentence or two.

## States
Loading / empty / error / permission. What each one shows.

## Scenarios
S1. One outcome, stated as a fact.
S2. …

## Data
Where it comes from. What is still mocked.

## Not covered
What the scenarios deliberately do not assert, and why.
```

## The invariant

**Every `S<n>` here is named by at least one test, and every test that names an
`S<n>` has one to point at.** Both directions, because both fail silently: an
untested scenario still reads like a promise, and a test naming a deleted
scenario still passes while asserting something undocumented.

- A built screen: any `*.test.ts` in `src/pages/<screen>/`, with `it()` named
  `S<n>: <the sentence>`.
- A screen not built yet: one `describe` block in
  `src/pages/pending-screens.scenario.test.ts`, opening with the spec's
  **filename** (`describe("item-detail (not built)")`) and holding an `it.todo`
  per scenario. That file **imports nothing**, so a screen that does not exist
  yet cannot break the build. When the screen lands, move the block and keep
  the numbers.

**More than one `it()` per scenario is normal and good.** The rule is
coverage, not a quota: `items.md`'s S5 has three tests — the overflow case, the
valid-page case, and the empty-result case — because the scenario is one
outcome and the ways of getting it wrong are several. Splitting them is how the
failure message tells you which one broke.

Run them with `pnpm test:scenario` — literally `vitest run scenario`, a filename
filter, no configuration.

**Checked, not remembered.** `pnpm scenario:check` reads the specs and the test
names and fails on three things: a scenario nothing covers, a test naming a
scenario that does not exist, and a screen under `pages/` with no spec at all.
It runs on pre-push and in CI, for the same reason `pnpm fsd:check` does —
a convention that only a reviewer enforces is a convention that decays.

## The constraint, and what it buys

**Scenarios never render.** No `render()`, no DOM, no `@testing-library`.

The consequence is a constraint on how screens are written: *any decision a
scenario asserts must live in a `.ts`, not inside a `.tsx` handler.* A filter
reset written as a ternary inside an `onChange` is unreachable to a scenario and
has to be extracted before it can be covered — so it gets extracted first.

That is the single-responsibility rule this codebase actually enforces, stated
as something a test can fail on rather than as advice. `items.filters.ts` is the
worked example: seven exported functions, one per scenario, and the page
component that uses them contains no branching of its own.

Rendering tests are still welcome — they just are not scenarios. Put them in
`<screen>.test.tsx` and let them cover markup and accessibility, which is what
rendering is good at.

## Writing a scenario

One outcome each. "S1: changing a filter returns to page 1" is a scenario;
"S1: the filter bar works" is not, because nothing can fail it.

Cite the requirement where there is one. A scenario with no source is a
guess, and guesses are what get deleted in six months by someone who cannot
tell whether they were load-bearing.

In the test, **comment each assertion with the bug it prevents**. Six months on,
that comment is the difference between fixing the code and deleting the test.

## Honesty

If something is deliberately not covered, it goes under `## Not covered` with
the reason. A spec that quietly omits the hard case reads exactly like one that
handles it.
