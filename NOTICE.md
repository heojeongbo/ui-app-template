# Third-party notices

This template is MIT ([LICENSE](LICENSE)). Some code in the repository was
written by other people and carries their terms. All of it is permissive —
there is no copyleft here, and nothing below restricts what you build.

This file exists because two of these are **copied into the tree** rather than
installed as dependencies, which is the case where attribution actually
applies.

## shadcn/ui — MIT

`packages/design/src/ui/primitive/**` is output of the shadcn CLI
([shadcn-ui/ui](https://github.com/shadcn-ui/ui), MIT). That is the intended
way to use it — the components are copied into your codebase so you own them —
but MIT asks that the notice travel with substantial portions, and twenty-odd
component files is substantial.

The files are unmodified apart from formatting and one import rewrite (`cn`
resolved to this repo's `lib/utils`), both applied by `pnpm ui:add`.

## protobuf-orm vocabulary — Apache-2.0

`packages/interfaces/calque/proto/orm/**` is the ORM annotation vocabulary,
vendored so codegen works offline.

Its provenance has two steps, and both matter:

- Taken from [heojeongbo/calque](https://github.com/heojeongbo/calque) (MIT),
  which publishes it as a **superset** of the upstream vocabulary.
- That upstream is
  [protobuf-orm/protobuf-orm](https://github.com/protobuf-orm/protobuf-orm),
  which is **Apache-2.0** — as the `go_package` lines in those files still
  record.

So the files are derivative of Apache-2.0 material. Apache-2.0 §4 asks that
redistribution carry the licence and state significant changes:

> Licensed under the Apache License, Version 2.0 (the "License"); you may not
> use these files except in compliance with the License. You may obtain a copy
> of the License at http://www.apache.org/licenses/LICENSE-2.0

**Changes from upstream:** calque added `RpcOptions.list` / `RpcList` and
`MessageOptions.scope` / `Scope` (both at field number 20). Extension numbers
are otherwise identical to upstream, which is what lets a schema written
against either compile here. Nothing in this repository modifies the files
further — see `packages/interfaces/calque/proto/orm/UPSTREAM-README.md`.

**If you delete the calque tier** (`packages/interfaces/calque/`), this section
stops applying. Nothing on the default path uses it.

## Bundled dependencies

Everything else arrives through `pnpm install` and is not redistributed by this
repository. The notable non-MIT entries, for completeness:

| Package | Licence | Where it runs |
| --- | --- | --- |
| `@bufbuild/protobuf` | Apache-2.0 AND BSD-3-Clause | **In the app bundle** |
| `lightningcss` | MPL-2.0 | Build only (Tailwind's CSS processor) |
| `caniuse-lite` | CC-BY-4.0 | Build only (browser targets data) |

`@bufbuild/protobuf` is the only one of the three that ships to a browser. If
you distribute this app as a binary — an Electron build, a native wrapper —
that is the one whose notice you need to carry. A web app served over HTTP is
the ordinary case and generally handled by a page like this one.

Full breakdown: `pnpm licenses list`.

## Checking this yourself

```sh
pnpm licenses list                    # every dependency, grouped by licence
pnpm licenses list --json | jq keys   # just the licence names
```

Re-run it when you add a dependency. The audit that produced this file found
360 MIT, 22 ISC, 19 Apache-2.0 and no copyleft; a GPL or AGPL entry appearing
in that list is the thing to look for.
