# Items

## Purpose

Browse, filter and page the item catalogue, and create, edit or delete a single
item. The reference screen for this template: it exercises zod-validated search
params, a route loader, query invalidation, a form, and every async state.

## States

| State | What it shows |
| --- | --- |
| Loading | The route's pending skeleton, whose block sizes mirror the header and rows so nothing jumps when data arrives. Suppressed under 300ms. |
| Empty, no filters | "No items yet" plus the create action — this is a first-run screen, not a failure. |
| Empty, filtered | "No items match these filters" plus a clear-filters action. A different message on purpose: the user's next move differs. |
| Error | Route error component with a retry button. |
| Refetching | Existing rows stay, dimmed, rather than collapsing to a skeleton. |

## Scenarios

S1. Changing the status filter returns to page 1.
S2. Typing a text filter returns to page 1, and clearing it removes the param
    from the URL rather than setting it to an empty string.
S3. Paging keeps every other filter.
S4. Changing the page size keeps the first visible row on screen.
S5. When a result arrives for a page past the end, the page is corrected to the
    last page that exists.
S6. The empty state distinguishes "nothing here yet" from "nothing matches".
S7. The range label counts real rows, so the last page shows the true count and
    not `page * pageSize`.
S8. The URL vocabulary (`status: "all"`, `q`) maps to the wire vocabulary
    (`UNSPECIFIED`, `query`) in exactly one place, shared by the route's loader
    and the page's query — so the two cannot prime and read different cache
    entries.

## Data

`example.v1.ItemService`, via `entities/item/api/item.queries.ts`.

Currently answered by the in-memory mock in `src/app/mocks/item.mock.ts`, which
filters, paginates, enforces the name uniqueness the schema declares, and
rejects with the same `Code`s a real backend would. Deleting the entry in
`src/app/mocks/index.ts` sends the calls over the wire; nothing else changes.

## Not covered

- **Sorting.** The search-param helper exists (`sortSearchSchema`) but the
  service takes no sort argument yet, and a client-side sort over one page is
  worse than none — it reorders 20 of 47 rows and looks broken.
- **Optimistic create.** The list is seeded from the mutation's response
  instead, because the server normalises what it stores (it trims) and
  optimistic values would flicker when the real ones arrive. See
  docs/ux/mutations.md for when optimistic IS the right call.
- **Concurrent edits.** The update sends a field mask, so two people editing
  different fields do not clobber each other — but two people editing the SAME
  field still race, and nothing detects it.
