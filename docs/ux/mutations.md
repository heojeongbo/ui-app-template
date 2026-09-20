# Mutations and toasts

How a write reports itself to the user.

## Principle

**Every user-initiated mutation reports both outcomes, at the explicit call
site.**

There is no global mutation toast. The `QueryClient` deliberately has no
`MutationCache.onError`, and that absence is commented in
`packages/core/src/query/query-client.ts` so nobody adds one thinking it was an
oversight. Only the call site knows whether the failure is already visible in
the UI, what the user was trying to do, and what wording makes sense.

Background and fire-and-forget writes — telemetry, a heartbeat — are not
mutations in this sense and are out of scope.

## Layering

| Layer | Responsibility |
| --- | --- |
| `entities/<x>/api/*.mutations.ts` | Transport only. No toast, no invalidation, no navigation, no `catch`. |
| The call site (page or feature) | Invalidate, toast, close, navigate. |
| Copy | From the screen's `*.content.ts`, never hardcoded in a shared package. |

A mutation hook that toasts on its own cannot be reused by a caller that needs
different cache effects — it has to be fought or copied. A hook that swallows
a rejection to log it leaves the call site unable to tell the user anything,
which is how a failed save looks like a successful one.

A wrapping hook that returns before the call site **must** surface failure —
rethrow, or return an explicit result. Never a log and a silent return.

## The sequence

```
clear stale server errors → validate → mutate → invalidate → toast → close
```

Each step is there because skipping it produces a specific bug:

- **Clear first.** A leftover `onServer` error keeps `canSubmit` false, so the
  retry never fires and the form looks frozen.
- **Await the invalidate before the toast.** "Created" appearing over a list
  that has not refreshed reads as a failure.
- **Close only on success.** On failure the dialog stays open with the user's
  input intact, so they fix one field instead of retyping everything.
- **Report the server's value, not the submitted one.** The server normalises
  — it trims, it assigns ids and timestamps — so echoing the input can name a
  row that does not exist.

Worked example: `apps/web/src/features/item-editor/item-editor.dialog.tsx`.

## The two shapes

Pick by whether the surrounding logic reads as callbacks or a linear flow.

```ts
// 1. mutate + callbacks
mutation.mutate(input, {
  onSuccess: async () => {
    await invalidate(itemQueries.lists())
    toast.success(content.applied)
  },
  onError: (error) => toastMutationError(error, { definite, indeterminate }),
  onSettled: () => setPendingId(null),
})
```

```ts
// 2. mutateAsync + try/catch — the form-submit flow
try {
  const saved = await mutation.mutateAsync(input)
  await invalidate(itemQueries.lists())
  toast.success(content.created(saved.name))
  close()
} catch (error) {
  toastMutationError(error, { definite, indeterminate })
}
```

## Tone

The tone of a toast is a claim about what happened. Getting it wrong is how a
user is told a write failed when it landed, retries, and creates a duplicate.

| Tone | Means | Example |
| --- | --- | --- |
| `success` | It completed. | "Created “widget 4”." |
| `info` | Acknowledged, applied, toggled — nothing was created or destroyed. | "Nothing changed." |
| `warning` | Partial, or **we cannot confirm the outcome**. | "Could not confirm the change. Refresh to see the current state." |
| `error` | A **definite** failure. The server refused. | "That name is already taken." |

The `warning`/`error` split is not stylistic. It comes from
`isDefiniteFailure()` in `@template/core/api`, which separates codes meaning
*the server gave a verdict* (`InvalidArgument`, `NotFound`, `AlreadyExists`,
`PermissionDenied`, `Unauthenticated`, `Unimplemented`, `FailedPrecondition`,
`OutOfRange`) from everything else — `Unavailable`, `DeadlineExceeded`,
`Internal`, `Aborted`, a network error. In the second group the write may well
have happened.

`toastMutationError()` in `apps/web/src/shared/lib/toast/` applies this. It is
the only wrapper around `toast`: sonner's API is already the vocabulary, and
what genuinely needs to live in one place is the classification.

It also **drops aborts entirely**. A cancelled request is the app working
correctly, and a toast for one is noise that trains people to ignore toasts.

## Server errors belong on fields

A rejection that names a field goes on that field. Without it the user gets
"Could not create the item" and has to guess which of nine inputs to change —
which is where most forms quietly stop being usable.

```ts
const fieldErrors = extractFieldErrors(error)   // core: knows the wire format
if (fieldErrors.length > 0) {
  const { unmatched } = applyServerFieldErrors(form, fieldErrors)  // design: knows the form
  if (unmatched.length > 0) toast.error(unmatched.map(e => e.message).join(" "))
  return
}
```

`unmatched` must be surfaced. A silently dropped error makes a failed save look
like a successful one. The split between the two halves is deliberate:
`extractFieldErrors` knows about ConnectRPC, `applyServerFieldErrors` knows
about TanStack Form, and neither knows about the other — so either can be
replaced alone.

## Destructive actions

Both halves, and they are not redundant.

**Confirm** stops the accident. Use `confirm()` from `shared/lib/confirm` — it
returns a promise, so the call site reads as a guard clause:

```ts
if (!(await confirm({ title, body, confirmLabel: "Delete", cancelLabel: "Cancel", destructive: true }))) return
```

Name the action, not the assent: "Delete", never "OK". Someone skimming should
tell the buttons apart without reading the body.

`acknowledge` adds a checkbox gate. Reserve it for the irreversible — putting
it on ordinary confirmations trains people to tick it without reading, which
removes the protection from the cases that needed it. And **gate one direction
only**: turning a safety off deserves friction, turning it back on does not.

**Undo** handles the accident that happened anyway. Confirmation dialogs have a
poor real-world hit rate; people click through them. The undo toast is what
actually saves the row:

```ts
toast.success(content.deleted(item.name), {
  action: { label: "Undo", onClick: () => void restore(item) },
})
```

If the undo cannot truly restore — recreating gives a new id, so old links
break — **say so in the copy**. `apps/web/src/pages/items/use-item-actions.ts`
says "Re-created … with a new id" rather than claiming a restore the user would
only disprove later.

## Pending state

- `loading` / `disabled` is a prop on the control, never a manual guard inside
  `onClick`. `form.SubmitButton` reads `isSubmitting` from form context, so no
  page threads it down by hand.
- For a grid of controls, keep **one** `pendingId` naming which row is acting,
  and derive `busy` from it to disable the peers. A boolean per row cannot
  express "this one is working, the others must wait", which is how two deletes
  race.
- **Disable Cancel while a request is open.** Closing mid-flight leaves a write
  in progress with nobody left to report its outcome.

## Optimistic updates

**Not the default.** The documented default is to await and then seed the cache
from the response:

```ts
const saved = await mutation.mutateAsync(input)
queryClient.setQueryData(itemQueries.detail(saved.id).queryKey, saved)
```

The server normalises what it stores, so optimistic values flicker when the
real ones arrive — and a cancelled confirm leaves nothing to unwind.

Reserve optimistic updates for latency-sensitive toggles and counters, where
the round trip is visible. When you use one, ship the whole recipe:

```ts
onMutate: async (next) => {
  // Without the cancel, an in-flight refetch can resolve AFTER this write and
  // revert the screen — and with a long staleTime nothing ever corrects it.
  await queryClient.cancelQueries({ queryKey: key })
  const previous = queryClient.getQueryData(key)
  queryClient.setQueryData(key, next)
  return { previous }
},
onError: (_e, _v, ctx) => queryClient.setQueryData(key, ctx?.previous),
onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
```

Roll back only on a **definite** failure. Reverting for a lost answer undoes a
write the server accepted.

## Invalidation

`useInvalidateQuery()` from `@template/core/query`. Variadic, parallel, and
referentially stable, so it is safe in a dependency list:

```ts
await invalidate(itemQueries.lists(), itemQueries.detail(id))
```

It takes `queryOptions` objects, so one definition serves both reading and
invalidating and the two cannot drift. It **refuses an empty query key** —
that matches every query in the cache, always comes from a key factory that hit
a missing id, and turns one stale list into a refetch of the whole app.

Three choices, in order of preference:

1. **Invalidate** — the default.
2. **`setQueryData` from the response** — when the mutation response *is* the
   read.
3. **`removeQueries`** — on delete, when the detail route is being left.

## Anti-patterns

- A global `MutationCache.onError` toast.
- `void mutation()` — discards the rejection, so failure is invisible.
- Swallowing a failure in `catch` with only a log.
- Toast copy hardcoded inside `packages/core` or `packages/design`.
- Closing a dialog before the request settles.
- Claiming failure for an indeterminate error.

## Checklist

- [ ] Success path toasts.
- [ ] Failure path toasts, with the tone chosen by `isDefiniteFailure`.
- [ ] Invalidation runs on success, and is **awaited before** the toast.
- [ ] Field-level server errors land on their fields; `unmatched` is surfaced.
- [ ] The dialog closes only on success; input survives a failure.
- [ ] Cancel is disabled while the request is open.
- [ ] Destructive actions confirm, and offer undo where the data allows it.
- [ ] Copy comes from a `*.content.ts`, not a string literal.
