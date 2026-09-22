# Sign in

## Purpose

Take a username and password, and send the user back to wherever the guard
interrupted them. The reference screen for form validation and for the rule
that a redirect target is checked at the router boundary, not in the form.

## States

| State | What it shows |
| --- | --- |
| Default | Both fields empty, submit enabled. |
| Invalid | The first error under the offending field, with `aria-invalid` and `aria-describedby` wired. Submit stays enabled so a retry is one click. |
| Submitting | Submit shows pending; Cancel has no equivalent here because there is nothing to cancel back to. |
| Refused | `toast.error` — the server said no, and said why. Input is kept. |
| Unreachable | `toast.warning` — the answer was lost. Claiming failure would be a claim we cannot support. |

## Scenarios

S1. A blank username is reported as missing.
S2. A blank password is reported as **missing**, not as too short — the
    "required" message must be the one that reaches the field.
S3. Any non-empty password is accepted, however short. Length is a rule for
    the screen that CREATES a password; enforcing it here locks out anyone
    whose password predates the current policy, before the server is asked.

## Data

None yet. `signin.page.tsx` holds a `setTimeout` stand-in where the auth RPC
goes, and calls `signIn()` on the session store directly. Replacing it with a
mutation is the intended first change — the surrounding shape (validate, call,
report both outcomes, navigate on success only) is what the screen
demonstrates.

The `?redirect=` parameter is validated in `routes/(public)/signin.tsx` with
`isSafeRedirect`, which is a type predicate, so `search.redirect` is a
`SafeRedirect` rather than a `string`. An unvalidated redirect is an open
redirect: it turns your own sign-in into a credible phishing hop.

## Not covered

- **Rate limiting and lockout.** Both belong to the server; a client-side
  attempt counter is trivially bypassed and only misleads the honest user.
- **"Remember me" and session length.** The session cookie is HttpOnly and
  lives outside JS, so its lifetime is not this screen's to set.
- **Password reset and sign-up.** No routes for them; add them under
  `(public)` so the guard cannot loop.
