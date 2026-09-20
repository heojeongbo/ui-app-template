/**
 * The single namespace every consumer imports generated types through.
 *
 * Call sites write `proto.example.v1.ItemSchema` rather than reaching into
 * `src/gen/example/v1/item_pb`. The indirection costs three lines and means a
 * regeneration that moves or renames a file changes zero call sites — which is
 * the difference between adding a field and a repo-wide find-replace.
 */
export * as example_v1 from "./gen/example/v1/item_pb";
