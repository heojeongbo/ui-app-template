# Home

## Purpose

The landing page after sign-in, and the screen you delete first. It exists to
prove the shell renders and to point at the reference screen — not to be a
dashboard.

## States

| State | What it shows |
| --- | --- |
| Default | A header and one link. There is no async state because there is no data. |

## Scenarios

**None**, and that is a statement rather than an omission.

A scenario names a decision a screen makes. This one makes none: it renders
fixed copy and one `<Link>`. Inventing "S1. The page renders" would give the
suite an assertion that cannot fail, and a spec that cannot fail teaches
readers to write more of them.

The triad is a shape, not a quota. When this screen grows a decision — a
personalised greeting, a widget that can be empty — it grows a `.ts` for that
decision and a scenario naming it, in the same change.

## Data

None. Nothing is fetched.

## Not covered

- **Anything a real home screen would do.** Recent activity, counts, shortcuts
  — all of them are the app's, not the template's. This screen is deliberately
  the smallest thing that still demonstrates `pages/<name>/` correctly, so
  replacing it is a delete rather than an untangle.
