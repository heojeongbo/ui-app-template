# Mocking

See [proto-and-transport.md](proto-and-transport.md#mocking) — the mocking
strategy is part of the data layer and is documented there so the two cannot
drift.

Short version:

- **RPCs with a `.proto`** → a Connect interceptor (`respond` + `intercept`).
  Runs in dev *and* in tests, and the data layer never knows.
- **Plain HTTP with no proto** → MSW.
- **A domain with no proto yet** → the dispatcher pattern: `foo.api.ts` is a
  two-line barrel re-exporting `foo.api.mock` today and `foo.api.real` later.

Enable with `VITE_ENABLE_MOCKS=true`.
