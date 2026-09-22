# Forms

A form is where a user spends effort before anything is saved. Every rule here
exists to avoid throwing that effort away, or to avoid lying about what
happened to it.

The mechanics — `useAppForm`, `form.AppField`, the field components — live in
[design-system.md](../design-system.md). This is the behaviour contract.

## The checklist

Put this on the pull request.

- [ ] Validation runs on **submit**, not on every keystroke.
- [ ] `<form.AppForm>` wraps anything from the form registry.
- [ ] Defaults are a member of the set each control offers.
- [ ] A submit that changes nothing does not send a request.
- [ ] An update sends a **field mask** — only what changed.
- [ ] Server field errors land **on the fields**.
- [ ] A failed submit **keeps the input** and leaves the form open.
- [ ] Success reports what the **server** stored, not what was typed.
- [ ] A dirty form is guarded on **both** exits.

## Validate on submit

Default to `validators: { onSubmit: schema }`. Add `onChange` only where
instant feedback is worth the noise — an availability check, a password
strength meter.

The reason is not performance. Validating as the user types tells them their
password is "too short" while they are still typing it, and their email is
invalid before they have reached the `@`. The form is correcting work that is
not finished.

`onBlur` on every field is separate and **mandatory**: without
`onBlur={field.handleBlur}` a `validators.onBlur` never runs at all, silently.
The field components in `packages/design` wire it, which is most of why they
exist.

## A default must be selectable

**A form's starting value has to be a member of the set its control offers.**

A default outside that set renders an empty `<select>` and fails validation on
a field the user never touched — which reads as the app being broken rather
than as their mistake.

The value that breaks this is almost never a weird one. A proto3 scalar is
absent on the wire when it holds the zero value, so a server that never set a
field sends something that decodes to the enum's zero member. And proto3 enums
are **open**: a server one version ahead sends a number this build has never
heard of. Both are outside the offered set, and `??` will not catch either —
it is nullish-only, and the zero member is `0`.

Resolve it explicitly. See `defaultSelectableStatus` in
`entities/item/model/item-status.ts`.

## Submit sends only what changed

Two rules, one reason: the server should be told what the user meant.

**Nothing changed → send nothing.** Firing the request anyway costs a round
trip and produces an "Updated" toast for a change that did not happen, which
teaches the user that the message means nothing.

**Something changed → send a field mask.** Omitting the mask tells the server
"this is the whole object", so a form that only edited `name` blanks
`description` for everyone else. Two people editing different fields of the
same row should not clobber each other.

Both decisions belong in a `.ts`. See `planSubmit` in
`features/item-editor/item-editor.submit.ts` — it returns `noop`, `create` or
`update`, and a scenario test asserts all three without rendering anything.

## Failure keeps the work

**The form stays open and the input stays in it.** A failed save that closes
the dialog has destroyed the user's work to show them an error about it.

**Server errors that name fields go onto those fields.** A rejection rendered
as "Could not save" makes the user guess which of five inputs to change.
`extractFieldErrors` reads them off the transport error and
`applyServerFieldErrors` routes them; anything that matched no field still has
to be surfaced, or a failed save looks like a successful one.

**Clear stale server errors before re-submitting.** A leftover error keeps
`canSubmit` false, so the retry never fires and the form just looks frozen.

**Cancel is disabled while the request is open.** Closing mid-flight leaves a
write in progress with nobody left to report its outcome.

## Success reports what was stored

Adopt the **server's** response, not the submitted values.

Servers normalise. This one trims, and a name echoed back from the input can
announce a value the row does not actually have. The same applies to the form's
new baseline after a successful save: `form.reset(response)`, so "dirty" means
"differs from what is stored" rather than "differs from what I first loaded".

While a form is open and **not** dirty, it is safe to re-seed it from a fresh
server value. Once it is dirty, it is not — that overwrites edits in progress.

## Guard a dirty form on both exits

There are two ways to abandon a form and they need different mechanisms:

| Exit | Caught by |
| --- | --- |
| Reload, tab close, leaving the site | `beforeunload` |
| A `<Link>`, a redirect, in-app back | TanStack Router's `useBlocker` |

`beforeunload` never fires for in-app navigation, because the document is never
unloaded — and in-app navigation is the common case. Guarding only the first is
the usual shape of this bug. `useUnsavedChangesGuard` in
`shared/lib/form/` does both, routing the in-app half through the app's own
`confirm()` so the question is phrased in the app's voice.

A dialog has a third exit the blocker never sees: **its own close** — Cancel,
Escape, the overlay, the X. Guard `onOpenChange`, not the Cancel button; the
three exits people actually take are the other ones.

**Arm the guard only when there is something to lose.** A prompt that fires on
a clean form trains users to dismiss prompts without reading them, and then it
protects nothing.

## Anti-patterns

- **`validators: { onChange: schema }` by default.** See above.
- **A schema at module scope.** It freezes whatever locale was active when the
  module first evaluated. Build it in a factory that takes `copy`, and
  `useMemo` it on that copy.
- **`await mutateAsync()` with no `catch`.** An unhandled rejection, and the
  user sees nothing at all.
- **Re-checking at the call site what the schema already validated.** Validate
  at the boundary and trust the parsed value; a second check is a second place
  to disagree.
- **Reading a form value with a cast.** If `value.status` needs
  `as SomeEnum`, the schema's inferred type was widened somewhere — fix that
  instead. See [architecture.md](../architecture.md#validation-boundaries).

## Further reading

- [ux/mutations.md](mutations.md) — the write contract the submit handler follows
- [ux/states.md](states.md) — the seven states, including what a form shows while saving
- [ux/copy.md](copy.md) — where the strings live
- [page-triad.md](../page-triad.md) — why the decisions above live in `.ts`
