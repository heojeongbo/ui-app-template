# Protobuf and the transport

Two tiers. Tier 1 needs only node; Tier 2 adds calque and a Go toolchain.

## Tier 1 — the default

```sh
pnpm gen:proto
```

`.proto` in `packages/interfaces/proto/`, generated TypeScript in
`src/gen/`, reached through one namespace:

```ts
import { proto } from "@template/interfaces"
proto.example_v1.ItemSchema
```

That namespace costs three lines and means a regeneration that moves or renames
a file changes zero call sites.

**The generated tree is committed.** A deliberate trade: the repo carries some
derived code, and in exchange a fresh clone can `pnpm install && pnpm dev` with
no buf, no Go and no network. CI runs the generator and then
`git diff --exit-code`, so a stale tree fails a build rather than drifting.

`gen-proto` wipes the output first, because buf only writes the files a schema
*currently* produces — a message deleted from a `.proto` otherwise leaves its
generated file behind forever, still importable and silently wrong.

Two setup choices worth knowing:

- **A single-module `buf.yaml`.** The `modules:`/`includes:` gymnastics you see
  elsewhere exists to work around proto trees that are symlinks into another
  repo. One in-repo directory needs one module.
- **No `import_extension`.** `protoc-gen-es` already defaults to extensionless
  imports, which is what a bundler wants. Setting `import_extension=ts` and
  then stripping it in a post-pass is work that only exists to undo itself.

`@connectrpc/protoc-gen-connect-es` is **not** needed. In connect-es v2 the
service descriptors come from `protoc-gen-es` itself; that package is stuck in
the v1 era.

## The transport

One factory, built **lazily**:

```ts
// app, at startup
configureTransport({ onUnauthenticated, interceptors })

// entities, inside a queryFn
const client = () => getClient(proto.example_v1.ItemService)
```

Lazy because the transport needs two things only `app` knows — how to sign out,
and which RPCs are mocked — while every entity's `api` segment needs the
transport. `shared` importing from `app` is the FSD direction reversed.
Deferring construction inverts the dependency, and the first real RPC happens
long after `configureTransport` runs, so there is no window in which an
unconfigured transport is used.

Clients resolve **per call** for the same reason: one built at module scope
captures a transport that has not been configured yet. `getClient` memoises, so
it is a map lookup.

Defaults: the **connect** protocol (JSON, so a failing call is readable in the
network tab) and `credentials: "include"` (the session cookie is HttpOnly, so
there is no Authorization header to attach, and omitting this makes every
request anonymous with no visible error). `grpc-web` is available for gateways
that require it.

### Interceptors

Two built in, and both **return the call unchanged**:

- **`loggingInterceptor`** logs every rejection. It does not toast — that is a
  decision only the call site can make.
- **`authInterceptor`** handles `Unauthenticated` once, centrally.
  `PermissionDenied` is deliberately not global.

An interceptor that swallows a rejection to log it takes the error away from
the error boundary, from retry, and from the call site's `catch` — the screen
then spins forever and nobody is told why.

The interceptor list is **explicit and ordered**: `[...builtins, ...extra]`.
Mutating the array after the transport exists makes the effective chain depend
on module evaluation order, and the resulting bug looks like an interceptor
that "sometimes" runs.

## Working with messages

- **`Timestamp.seconds` is a bigint.** `new Date(ts.seconds * 1000)` throws
  ("Cannot mix BigInt and other types"). Use `toDate` / `fromDate` / `toMillis`
  from `@template/core/proto` — they also handle the optionality, where the
  natural `timestampDate(x!)` turns a missing value into an `Invalid Date` that
  renders as "NaN" three components away.
- **Log messages through `protoJson(Schema, msg)`.** Passing one directly
  prints internal symbols, and `JSON.stringify` throws outright on bigint
  fields.
- **Use a field mask for partial updates.** Without one, a partial update is
  indistinguishable from "set everything else to empty", and two people editing
  different fields of the same row clobber each other.
- **Return the entity from a mutation, not just its id.** The server
  normalises; seeding the read cache with the *response* is what keeps a list
  and a form agreeing.
- **Derive form defaults from the generated message type, never a hand-written
  literal.** A form's shape is usually *not* the request's shape — a `<select>`
  yields strings whatever the proto says — so `satisfies z.ZodType<Request>`
  generally cannot be written. What does work is typing the function that
  builds the defaults: `itemEditorDefaults(item: proto.example_v1.Item):
  ItemEditorValues` turns a renamed field into a compile error. Pair it with a
  mutation input typed as `Omit<GeneratedRequest, "$typeName">`, which catches
  the added-field case the defaults cannot.

## Mocking

The primary strategy is a **Connect interceptor** — `respond()` plus
`intercept(method, …)`. The app's data layer is entirely unaware it is being
mocked, so queries, mutations, invalidation, error handling and loading states
all run for real.

`intercept()` is not optional. An unwrapped handler answers **every** RPC — it
has no idea which method it was registered for — and it still type-checks, so
the mistake surfaces as unrelated endpoints returning the wrong shape.

Make the mock behave like a server, not a stub: filter, paginate, enforce the
constraints the schema declares, and reject with the `Code`s a real backend
would. `item.mock.ts` rejects a duplicate name with `AlreadyExists` carrying
`name: …`, which is what `extractFieldErrors` parses back onto the field.

Fixtures are **deterministic** — a djb2 hash and a fixed epoch, never
`Math.random()` or `Date.now()`. A fixture that differs between runs makes a
failure unreproducible and hides ordering bugs behind data that happens to be
sorted today. `respond()` adds 250ms of latency by default, because a mock that
answers synchronously never lets a loading state render.

Mocks are gated on `VITE_ENABLE_MOCKS` **alone**, not on `import.meta.env.DEV`.
Requiring a dev build sounds safer and makes the flag useless for its main job:
the e2e suite drives the production bundle. The safety is that the flag is off
unless set, plus an unconditional startup `warn`.

For plain HTTP with no proto — a file upload, a health check, a third-party
REST API — use MSW instead. Hand-encoding protobuf bodies at the network layer
is the wrong tool; intercepting the typed call is the right one.

Registering a mock in `src/app/mocks/index.ts` is what makes the swap to a real
server a **deletion**: remove the entry and the call goes over the wire.

## Tier 2 — calque

Opt-in, and documented in `packages/interfaces/calque/README.md`. It generates
a Dexie-backed local store and a normalised client from `orm`-annotated
schemas. Its generator is a **Go program** (`npm view @heojeongbo/calque` is a
404), which is the whole reason it is separate.

```sh
pnpm gen:proto:calque   # needs Go >= 1.26.3
```

Delete `packages/interfaces/calque/` and the template still works — nothing on
the default path imports from `src/gen-calque`.
