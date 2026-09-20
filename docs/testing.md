# Testing

Four levels. Each catches something the others cannot.

| Level | Runs | Catches |
| --- | --- | --- |
| Unit | `pnpm test` | Pure logic — coercion, error classification, search schemas |
| Scenario | `pnpm test:scenario` | Screen decisions, without rendering |
| Integration | `pnpm test` | The router, guards, loaders, the whole data chain |
| End-to-end | `pnpm e2e` | The real bundle, real CSS, real focus and keyboard |

## Unit

Colocated `*.test.ts`. Test the pure helper, not the component that calls it.

**Comment each assertion with the bug it prevents.** Six months on, that
comment is the difference between fixing the code and deleting the test.

```ts
it("falls back on a stale or hand-edited URL", () => {
  // A bookmark outlives the code that produced it; `?page=abc` should show
  // page 1, not a router error screen.
  expect(schema.parse({ page: "abc" }).page).toBe(1)
})
```

## Scenario

One `it` per `S<n>` in the screen's spec, same numbers, same sentences.
**Never renders.** See [page-triad.md](page-triad.md) and
`apps/web/docs/screens/README.md`.

## Integration

`apps/web/src/app/router.test.tsx` mounts the **real** route tree with
`createMemoryHistory` and the **real** mock interceptors — so a pass proves the
whole chain ran: route → loader → `ensureQueryData` → `queryFn` → transport →
interceptor → protobuf → page.

Assert on data, not just on a pathname. `expect(pathname).toBe("/items")`
passes with an empty screen.

These tests earned their keep immediately: they found that the sign-in page had
**no heading at all** (shadcn's `CardTitle` renders a `<div>`, so heading
navigation — the main way a screen-reader user orients — found nothing). The
fix went in the page, not in the test.

## End-to-end

Playwright, against a **production build** with mocks on. Not the dev server:
its transform pipeline is not what ships, and a suite that waits on HMR flakes.

Query by **role**. A test that finds a button by role only passes while the
button *is* a button with an accessible name, so the suite holds the
accessibility tree honest as a side effect of existing.

**Read fixture values off the page rather than hardcoding them.** A test that
assumed `"widget 1"` existed was asserting nothing, because the name hash puts
a different word at that index.

```sh
pnpm -C e2e install-browsers   # once per machine
pnpm e2e
pnpm -C e2e test:ui            # pick through failures
```

## What CI gates

Cheapest first, so a formatting mistake fails in thirty seconds:

lint → FSD boundaries → type-check → unit + scenario → **protobuf is current**
→ **route tree is current** → e2e.

The last two are diff checks. Both trees are generated *and* committed, and
neither has any other way to tell you it has gone stale.

## Local gates

- **pre-commit** — lint-staged. Fast enough to stay honest; a hook that takes
  30s is a hook people bypass with `--no-verify`.
- **pre-push** — type-check and the FSD boundary check. Slow checks must not
  reach the remote, but they should not tax every commit either.
