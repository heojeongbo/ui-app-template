import { type Timestamp, timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";

/**
 * Timestamp ↔ Date, in one place.
 *
 * A `google.protobuf.Timestamp` deserialises to `{ seconds: bigint, nanos:
 * number }` — **`seconds` is a bigint**, so `new Date(ts.seconds * 1000)`
 * throws ("Cannot mix BigInt and other types") and `Number(ts.seconds) * 1000`
 * is the correct-but-easy-to-forget spelling. protobuf-es ships the conversion;
 * this module exists to make the *optional* case safe, which it does not
 * handle.
 *
 * Optionality is the real trap. A proto message field is optional at the type
 * level, so `item.createdAt` is `Timestamp | undefined` on every read, and the
 * natural `timestampDate(item.createdAt!)` turns a missing value into
 * `Invalid Date` that then renders as "NaN" three components away.
 */

/** A Timestamp to a Date, or `undefined` if the field was never set. */
export function toDate(timestamp: Timestamp | undefined): Date | undefined {
	return timestamp === undefined ? undefined : timestampDate(timestamp);
}

/** A Date to a Timestamp, passing `undefined` through unchanged. */
export function fromDate(date: Date | undefined): Timestamp | undefined {
	return date === undefined ? undefined : timestampFromDate(date);
}

/**
 * Milliseconds since the epoch, for sorting and comparison.
 *
 * Sorting by the raw `{ seconds, nanos }` object compares object identity;
 * sorting by `seconds` alone silently ties every row written in the same
 * second, which shows up as a list whose order changes between renders.
 *
 * Unset yields `-Infinity`, so a row whose timestamp was never set lands at
 * the start of an ascending sort rather than in an arbitrary position.
 *
 * That applies to sorting ROWS by an unset field, which is the real case.
 * Sorting an array that literally contains `undefined` elements is a different
 * thing: `Array.prototype.sort` never passes those to the comparator and
 * always moves them to the end, whatever it returns.
 */
export function toMillis(timestamp: Timestamp | undefined): number {
	if (timestamp === undefined) return Number.NEGATIVE_INFINITY;
	return Number(timestamp.seconds) * 1000 + timestamp.nanos / 1e6;
}
