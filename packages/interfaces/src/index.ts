/**
 * The contract package's public surface.
 *
 * Consumers write `proto.example_v1.ItemSchema` rather than reaching into
 * `src/gen/...`. The indirection costs three lines and means a regeneration
 * that moves or renames a generated file changes zero call sites.
 *
 * The opt-in calque tier is NOT re-exported here. It lives at
 * `@template/interfaces/gen-calque/...` so that nothing on the default path
 * can pull a Dexie-backed store into its bundle by accident — and so deleting
 * `calque/` never breaks this file. See calque/README.md.
 */
export * as proto from "./proto";
