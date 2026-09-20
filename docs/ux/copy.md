# Copy

Where user-facing strings live, and how they are written.

## Where

**Every screen's copy lives in its own `*.content.ts`.** Not inline in JSX.

Three things fall out of that: the page component becomes pure rendering, a
scenario test can assert against the same strings the UI shows, and swapping
the module for an i18n dictionary later touches nothing else.

## Shared packages carry no copy

`packages/core` and `packages/design` ship **zero** strings a user reads. A
component there is used by screens whose language and wording differ, and a
hardcoded label is a decision the consuming app cannot undo.

A shared component that needs words takes a `<Name>Copy` prop. Type each field
by **where it lands**:

| Where it lands | Type | What the page passes |
| --- | --- | --- |
| Rendered as content | `ReactNode` | `c.foo` |
| `toast()`, `aria-*`, `placeholder`, a zod message | `string` | `c.foo.value` |
| Interpolated | `(v) => ReactNode \| string` | `(v) => c.foo(v)` |
| Read by a dynamic key | `Record<K, ReactNode>` | every key, listed |

That last row matters: key a record by a stable `id`, never by array position.
A reordered nav with position-keyed labels puts the wrong word on every item.

**Never spread a dictionary node into such a prop.** An i18n leaf is
`ReactNode & { value: T }`, not a string, so `{...c.foo}` will not satisfy the
`string` fields. Build the object field by field.

Keep technical tokens hardcoded in the shared package — axis names, protocol
names, units. Only operator-facing sentences cross the boundary.

## Voice

**Sentence case.** Not Title Case.

**Say what is true right now.** "Signing in…" while the request is open, not
"Signed in". "Power-off started — the robot is going offline", not "Powered
off". The second is a promise about the future dressed as a report.

**Never claim a failure when the answer was merely lost.** This is the one that
costs users data, because they retry and duplicate the write:

- ✅ "Could not confirm the change. Refresh to see the current state."
- ❌ "Failed to save."

The tone table in [mutations.md](mutations.md) is the machinery; this is the
wording.

**Say what is actually true about an action's limits.** The items screen's undo
recreates rather than restores, so the row comes back with a new id. The toast
says "Re-created “widget 4” with a new id" — claiming a restore is a lie the
user only discovers when an old link 404s.

**Name what the thing does for the user, not the system that does it.** "Could
not reach the server", not "gRPC transport error".

**Name the action, not the assent.** A confirmation's buttons are "Delete" and
"Cancel", never "OK" and "Cancel" — someone skimming must be able to tell them
apart without reading the body.

**Label a toggle with what it does, not what it is.** "Switch to dark mode" on
a button that switches to dark. "Dark mode" is ambiguous about which state it
reports.

**Two empty states, two messages.** "No items yet" and "No items match these
filters" lead to different actions. One message for both sends half the users
to the wrong one.

## Comment load-bearing copy

If a string's exact wording prevents a specific misunderstanding, say so in a
comment next to it. Six months on, that comment is the difference between
someone "tidying" it and leaving it alone.

```ts
// Says what actually happened. The undo recreates rather than restores, so the
// row comes back with a new id — claiming "restored" would be a lie the user
// only discovers when an old link 404s.
restored: (name: string) => `Re-created “${name}” with a new id.`,
```

## A shared vocabulary

Keep one `common` namespace for the words every screen needs — cancel, save,
add, apply, reset, delete, loading, no data — so twelve screens do not
independently choose between "Remove" and "Delete".
