# Async states

Every data-driven surface has seven states. Most bugs users actually report are
one of them missing.

## The checklist

Put this on the pull request.

- [ ] **Loading** — a skeleton whose layout mirrors the real content.
- [ ] **Empty, nothing yet** — and the action that creates the first one.
- [ ] **Empty, nothing matches** — different wording, different action.
- [ ] **Error** — with a retry.
- [ ] **Refetching** — visible, without collapsing what is on screen.
- [ ] **Mutating** — the acting control shows it; its peers disable.
- [ ] **Failure** — toast with the right tone, nothing destroyed, input kept.

## Loading

A **skeleton**, not a spinner, for content areas. Its blocks should be roughly
the size of the header and rows they stand in for, so nothing jumps when the
data arrives — `apps/web/src/shared/ui/route-pending.tsx` is the example.

Spinners are for indeterminate inline actions: a button mid-request, a small
control. They say "something is happening"; a skeleton also says "here is what
is coming".

Suppress a short one. The router sets `defaultPendingMs: 300` and
`defaultPendingMinMs: 500`: below 300ms nothing appears, and once it does it
stays long enough to read. Without the pair, a fast-but-not-instant navigation
flickers, which reads as a glitch.

`role="status"` and `aria-busy` on the container. A sighted user sees the
skeleton; a screen-reader user gets silence unless something says so.

## Empty

Two different states, and conflating them sends half your users to the wrong
action:

| | Wording | Action |
| --- | --- | --- |
| Nothing yet | "No items yet" | Create the first one |
| Nothing matches | "No items match these filters" | Clear filters |

`hasActiveFilters(search)` decides which — a pure function, so a scenario test
can assert it without rendering. Use `<EmptyState icon title description
action />`; an empty state without an action is a dead end.

## Error

**Every error surface offers a way forward.** An error screen with no retry
makes every transient network blip terminal, and the user's only recourse is a
full reload that loses their place.

Route-level errors use `RouteError`, which calls `router.invalidate()` — that
re-runs the loader, where resetting the boundary alone would just re-render the
same failure. When the error is a definite failure it says so, rather than
letting the user press retry three times to find out.

Route-level or in-page, and they answer different questions:

- **Route-level** — the data the whole page needs did not arrive, so there is
  no page to show. The router's `defaultErrorComponent` handles it.
- **In-page** — one region failed and the rest still works. Wrap it in
  `<Boundary>` from `@template/design/ui/boundary`. Blanking the screen around
  a failed panel throws away work the user can still see and act on.

Give `<Boundary>` a `resetKey` — usually the id of whatever is shown. A
boundary that has caught stays caught until something resets it, so without one,
opening a row that works after a row that threw keeps showing the first row's
failure.

**A boundary only ever sees rendering.** An error thrown from an event handler
or an async callback never reaches it — those belong to the mutation contract
in [mutations.md](mutations.md). Expecting a boundary to cover them is the most
common way one ends up covering nothing.

The demo wraps the item editor: a dialog that fails to render should not take
the list behind it down. See `pages/items/items.page.tsx`.

## Refetching

Keep what is on screen. `apps/web/src/pages/items/items.table.tsx` dims the
table (`opacity-60`, a 200ms transition) and sets `aria-busy`.

Collapsing back to a skeleton on every refetch makes a list that revalidates
feel like it is constantly reloading, and it loses the scroll position.

The distinction is `isFetching` **without** the suspense-pending case:
"refreshing what you can see" versus "loading for the first time".

## Mutating

See [mutations.md](mutations.md). In short: `loading`/`disabled` is a prop on
the control; one `pendingId` names the acting row and disables its peers;
Cancel is disabled while the request is open.

## Motion

- `duration-200` is the default for state transitions. Reserve `300`/`500` for
  deliberate large moves.
- `animate-spin` = pending. `animate-pulse` = skeleton.
  `rotate-180 transition-transform` = an expand chevron.
- `tw-animate-css`, **not** `tailwindcss-animate` — the latter is the Tailwind
  v3 package.
- Open/close via `data-[state=open]:animate-in data-[state=closed]:animate-out`
  plus `fade-*` / `zoom-*`, so Radix drives it.

Respect `prefers-reduced-motion`. It is in `packages/design/src/style/style.css`
and applies globally — animation is a comfort, and for some people a
vestibular trigger.

## Accessibility

Biome's `recommended` preset turns the whole a11y group on, and it stays on.
A `biome-ignore lint/a11y/*` needs a comment saying why.

Conventions that lint cannot check:

- `role="status"` + `aria-busy` on loaders; `role="alert"` on errors.
- Icon-only buttons carry `sr-only` text naming the action **and its target**:
  "Delete: widget 4", not "Delete".
- Decorative icons get `aria-hidden="true"`.
- `useId()` for every label↔control pair. Two forms can be mounted at once — a
  dialog over a page form — and duplicate ids point every label at the first.
- `aria-invalid` is `true` or **absent**, never `"false"`. Tailwind's
  `aria-invalid:` variant matches `[aria-invalid="true"]`, so a falsy attribute
  styles nothing while still claiming a state.
- `aria-describedby` links a control to its error. Red text announces nothing.
- Query by role in tests. A test that finds a button by role only passes while
  the button *is* a button with an accessible name, so the suite holds the
  accessibility tree honest as a side effect of existing.

Radix handles focus trapping and restoration in dialogs. Do not fight it.
