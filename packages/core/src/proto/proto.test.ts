import { create } from "@bufbuild/protobuf";
import { TimestampSchema } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";

import { protoJson } from "./json";
import { fromDate, toDate, toMillis } from "./time";

const ts = (seconds: number, nanos = 0) =>
	create(TimestampSchema, { seconds: BigInt(seconds), nanos });

describe("toDate", () => {
	it("converts a Timestamp", () => {
		expect(toDate(ts(1_700_000_000))?.toISOString()).toBe(
			"2023-11-14T22:13:20.000Z",
		);
	});

	it("passes an unset field through as undefined", () => {
		// Every proto message field is optional at the type level, so the natural
		// `timestampDate(x!)` turns a missing value into an Invalid Date that
		// renders as "NaN" somewhere far away.
		expect(toDate(undefined)).toBeUndefined();
	});
});

describe("fromDate", () => {
	it("round-trips through toDate", () => {
		const date = new Date("2024-03-01T12:34:56.000Z");
		expect(toDate(fromDate(date))?.toISOString()).toBe(date.toISOString());
	});

	it("passes undefined through", () => {
		expect(fromDate(undefined)).toBeUndefined();
	});
});

describe("toMillis", () => {
	it("includes sub-second precision", () => {
		// Sorting on `seconds` alone ties every row written in the same second,
		// which shows up as a list whose order changes between renders.
		expect(toMillis(ts(10, 500_000_000))).toBe(10_500);
	});

	it("sorts a row whose timestamp is unset first in ascending order", () => {
		// Sorting ROWS, not bare timestamps: `Array.prototype.sort` never passes
		// an `undefined` ELEMENT to the comparator — it moves those to the end
		// regardless of what the comparator says. The real case is always an
		// object with an unset field, where the comparator does run.
		const rows = [
			{ id: "b", at: ts(2) },
			{ id: "never", at: undefined },
			{ id: "a", at: ts(1) },
		];

		const sorted = rows.sort((x, y) => toMillis(x.at) - toMillis(y.at));

		expect(sorted.map((r) => r.id)).toEqual(["never", "a", "b"]);
	});

	it("does not throw on the bigint seconds field", () => {
		// `new Date(ts.seconds * 1000)` throws "Cannot mix BigInt and other
		// types" — the reason this helper exists at all.
		expect(() => toMillis(ts(1_700_000_000))).not.toThrow();
	});
});

describe("protoJson", () => {
	it("renders a message as readable JSON", () => {
		expect(protoJson(TimestampSchema, ts(1_700_000_000))).toBe(
			"2023-11-14T22:13:20Z",
		);
	});

	it("serialises a bigint field that JSON.stringify would refuse", () => {
		// `JSON.stringify` throws outright on a BigInt, so a log line carrying a
		// raw message takes the whole call with it.
		expect(() => JSON.stringify(protoJson(TimestampSchema, ts(1)))).not.toThrow();
	});

	it("returns null for an unset message", () => {
		expect(protoJson(TimestampSchema, undefined)).toBeNull();
	});

	it("reports a conversion failure instead of throwing", () => {
		// Logging must never be the thing that breaks a request.
		const broken = { $typeName: "google.protobuf.Timestamp" } as never;
		const result = protoJson(TimestampSchema, broken);
		expect(result).toMatchObject({ $error: "protoJson failed" });
	});
});
