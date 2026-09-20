# The vocabulary a schema imports

This tree is calque's published superset of the upstream `orm` vocabulary
(`buf.build/orm/orm`): every message, field and number upstream has, exactly,
plus what calque added — today `RpcOptions.list = 20` and `RpcList`,
`MessageOptions.scope = 20` and `Scope`. A schema that only uses upstream's
words can keep importing upstream; a schema that says `list` or `scope`
imports this tree instead, and nothing else about it changes — extensions
resolve by number, and the numbers agree.

Two drift tests hold the promise. `ormopt`'s upstream comparison asserts this
shape is upstream plus exactly the additions it names, so an upstream release
growing into a number calque took fails a test loudly instead of making one
annotation mean two things. A second asserts this tree and calque's internal
vendored copy (`proto/calque/orm`, package `calque.orm`) agree number for
number, so the vocabulary a schema is written against and the one calque
decodes are the same vocabulary.

To consume it: vendor these files into your proto tree, or add this directory
as a buf module input in place of `buf.build/orm/orm`. The `go_package` lines
still name upstream's module — a Go consumer remaps them the way a buf
managed-mode override already does for the upstream copy.
