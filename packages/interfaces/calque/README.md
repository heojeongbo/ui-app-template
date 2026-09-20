# calque — the opt-in offline/ORM tier

Everything under this directory is **Tier 2**. Delete it and the template still
works: nothing on the default path imports from `src/gen-calque`.

## What the two tiers are

| | Tier 1 — default | Tier 2 — this directory |
| --- | --- | --- |
| Command | `pnpm gen:proto` | `pnpm gen:proto:calque` |
| Needs | node | node **+ Go >= 1.26.3** |
| Input | `proto/` | `calque/proto/schema/` |
| Output | `src/gen/` | `src/gen-calque/` |
| Gives you | message types, service descriptors, a Connect client | the above **plus** a Dexie-backed local store, a normalised query table, and a generated RPC surface |

Tier 1 works with any `.proto` and is what the app uses. Tier 2 is for when you
want reads to be served from IndexedDB and reconciled against the server —
offline support, instant navigation, optimistic local writes.

## Why it needs Go

calque's generator is a Go program. `npm view @heojeongbo/calque` is a 404; only
the *runtime* (`@heojeongbo/calque-dexie`) is on npm. The version is pinned in
the workspace `go.mod` rather than resolved as `@latest`, so a regeneration
produces the same output tomorrow as it does today.

## Why two passes

`pnpm gen:proto:calque` runs `buf generate` twice, and the split is not cosmetic:

1. **`service`** reads the `rpc: { crud: true, list: {} }` annotations and emits
   `item_svc.g.proto` — the RPC surface those annotations imply — *next to* the
   entity, so it joins the module.
2. **`ts`** reads entity + service together and emits the client, the Dexie
   table and the schema map.

Running pass 2 alone **succeeds** and produces an empty `ServiceClient` and an
empty `queries` table: valid TypeScript that does nothing. There is no error,
because from calque's point of view a schema with no service simply has no RPCs.
That silent-empty result is why the script always runs both.

## Why `proto/orm/` is vendored

`orm.proto` and its imports are calque's published **superset** of
`buf.build/orm/orm`: every message and field number upstream has, plus
`RpcOptions.list` and `MessageOptions.scope`. Extensions resolve by number, so a
schema written against upstream compiles here unchanged — but a schema that says
`list` or `scope` needs this copy, and the BSR one will reject it.

Vendoring rather than taking the BSR dependency also means codegen works with no
network. The files are upstream's; do not edit them. Re-vendor from
`heojeongbo/calque` at `proto/orm/` when you bump the generator.

## Settings worth knowing

- **`dexie.compat: none`**, not the `orm-ts` default. `orm-ts` emits index
  declarations for shapes IndexedDB cannot resolve, so the generated schema
  looks richer than the store can honour and the mismatch shows up as a query
  that silently returns nothing.
- **`ts.import_extension: ""`** to match what protoc-gen-es emits for Tier 1.

## Known gap

`list` is declared in the schema and calque reports:

> the schema declares list; the ts table does not emit it yet, and the client's
> list descriptor still works

So the *client* can call `List`, but the local Dexie table does not yet serve it.
Listing is served from the server for now. Left in the schema deliberately: the
declaration is correct, and removing it to silence a notice would be the wrong
direction.

## Turning it off

```sh
rm -rf packages/interfaces/calque packages/interfaces/src/gen-calque
rm packages/interfaces/scripts/gen-proto-calque.mts go.mod go.sum
```

Then drop `gen:proto:calque` from `packages/interfaces/package.json` and the
`@heojeongbo/calque-dexie` / `dexie` dependencies.
