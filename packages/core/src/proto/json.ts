import {
	type DescMessage,
	type JsonValue,
	type MessageShape,
	toJson,
} from "@bufbuild/protobuf";

/**
 * A protobuf message, rendered so a human can read it.
 *
 * Passing a message straight to a log call prints the runtime representation:
 * `$typeName`, internal symbols, `bigint` fields that `JSON.stringify` then
 * refuses outright ("Do not know how to serialize a BigInt"). The generated
 * schema is what knows the field names and wire types, so conversion needs it.
 *
 *     log.lazy("debug", "item received", () => protoJson(ItemSchema, item))
 *
 * Wrapped in `lazy` on purpose — serialising a message is exactly the kind of
 * work that should not happen when the level would drop the line.
 */
export function protoJson<Desc extends DescMessage>(
	schema: Desc,
	message: MessageShape<Desc> | undefined,
): JsonValue {
	if (message === undefined) return null;

	try {
		return toJson(schema, message);
	} catch (error) {
		// Never let logging be the thing that breaks a request. A message that
		// fails to serialise is usually a schema/instance mismatch, which is
		// itself worth seeing — so report it rather than throwing.
		return {
			$error: "protoJson failed",
			$reason: error instanceof Error ? error.message : String(error),
			$type: schema.typeName,
		};
	}
}
