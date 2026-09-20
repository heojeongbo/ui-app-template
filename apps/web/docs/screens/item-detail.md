# Item detail

> **Not built.** Its scenarios live as `it.todo` in
> `src/pages/pending-screens.scenario.test.ts`. Move that block to
> `pages/item-detail/item-detail.scenario.test.ts` when the screen lands, and
> keep the numbers.
>
> This file exists as the worked example of specifying a screen *before*
> building it — the spec is reviewable, and nothing in it can break the build.

## Purpose

Show one item in full and let it be edited or deleted from its own URL, so a
row can be linked to, bookmarked and shared.

The list already shows every field it has room for. This screen exists for the
things a row cannot carry — the full description, both timestamps — and to give
a single item an addressable URL.

## States

| State | What it shows |
| --- | --- |
| Loading | Route pending skeleton, mirroring the header and field rows. |
| Error | Route error component with retry. |
| Not found | A distinct screen, not an error: "This item no longer exists", with a link back to the list. A deleted item is an expected outcome, not a failure. |
| Deleting | The delete button shows pending; edit disables alongside it. |

There is no empty state. A detail screen either has its item or does not.

## Scenarios

S1. Shows the item's full description and both timestamps, formatted from the
    protobuf `Timestamp` rather than rendered raw.
S2. Editing a single field sends only that field in the update mask, so a
    concurrent edit to a different field is not clobbered.
S3. A deleted item shows a not-found state, not an error — including when the
    deletion happened in another tab.

## Data

`example.v1.ItemService.GetItem`, via `itemQueries.detail(id)`.

The route's loader primes it with `ensureQueryData`. Navigating from the list
is therefore instant when the list's data is fresh, because `getItem` and the
list share nothing — worth noting, since it means the detail always costs one
request on a cold arrival.

Mutations reuse `useUpdateItem` / `useDeleteItem` from `entities/item`; only
the invalidation targets differ from the list screen's — `detail(id)` as well
as `lists()`.

## Not covered

- **Optimistic edit.** Same reasoning as the list: the server normalises what
  it stores, so an optimistic value flickers when the real one arrives. See
  docs/ux/mutations.md.
- **Delete-and-undo.** On this screen a delete navigates away, and an undo
  toast that outlives the route would re-create a row the user is no longer
  looking at, under a new id. The list is the right place for undo.
- **Concurrent-edit detection.** The field mask stops two people editing
  *different* fields from clobbering each other. Two people editing the **same**
  field still race, and nothing detects it — that needs a version or an ETag the
  service does not have.
