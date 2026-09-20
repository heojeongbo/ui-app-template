import { Code, ConnectError } from "@connectrpc/connect";
import { describe, expect, it } from "vitest";

import { extractFieldErrors } from "./field-errors";

describe("extractFieldErrors", () => {
	it("parses `field: message` lines", () => {
		const error = new ConnectError(
			"email: already registered\nname: must not be empty",
			Code.InvalidArgument,
		);

		expect(extractFieldErrors(error)).toEqual([
			{ field: "email", message: "already registered" },
			{ field: "name", message: "must not be empty" },
		]);
	});

	it("handles nested and indexed paths", () => {
		const error = new ConnectError(
			"address.city: required\nitems[0].qty: must be positive",
			Code.InvalidArgument,
		);

		expect(extractFieldErrors(error)).toEqual([
			{ field: "address.city", message: "required" },
			{ field: "items[0].qty", message: "must be positive" },
		]);
	});

	it("leaves ordinary prose containing a colon alone", () => {
		// "Could not save" is not a field, and attaching the message to one would
		// send the user editing something that was never the problem.
		const error = new ConnectError(
			"Could not save: try again later",
			Code.InvalidArgument,
		);
		expect(extractFieldErrors(error)).toEqual([]);
	});

	it("ignores codes that are not about specific input", () => {
		// A PermissionDenied is not a field-level problem even if its text
		// happens to look like one.
		const error = new ConnectError("email: nope", Code.PermissionDenied);
		expect(extractFieldErrors(error)).toEqual([]);
	});

	it("returns nothing for a non-Connect error", () => {
		expect(extractFieldErrors(new TypeError("fetch failed"))).toEqual([]);
	});

	it("prefers structured details over the message convention", () => {
		const error = new ConnectError("email: from text", Code.InvalidArgument);
		// Duck-typed on purpose: different backends attach structurally identical
		// but differently-named google.rpc messages.
		//
		// NOTE this is the OUTGOING shape — `value` already an object. It is not
		// what arrives from a server; see the next test, which is the one that
		// matters and the one this suite was missing.
		(error.details as unknown[]).push({
			value: {
				fieldViolations: [{ field: "email", description: "from details" }],
			},
		});

		expect(extractFieldErrors(error)).toEqual([
			{ field: "email", message: "from details" },
		]);
	});

	it("reads details in the shape a real server actually sends", () => {
		// The regression that mattered, and the reason the test above was not
		// enough: `ConnectError.details` is `(OutgoingDetail | IncomingDetail)[]`,
		// and on anything that crossed the wire `value` is the raw `Uint8Array`
		// while the decoded payload is in `debug`.
		//
		// Reading only `value` was not a partial match but never a match —
		// `typeof new Uint8Array() === "object"` passes the guard and
		// `.fieldViolations` on it is `undefined`. `fromDetails` returned `[]`
		// for every real input, so a server doing the precise structured thing
		// was silently ignored in favour of parsing its error text.
		const error = new ConnectError("email: from text", Code.InvalidArgument);
		(error.details as unknown[]).push({
			type: "google.rpc.BadRequest",
			value: new Uint8Array([10, 5, 1, 2, 3, 4, 5]),
			debug: {
				fieldViolations: [{ field: "email", description: "already taken" }],
			},
		});

		expect(extractFieldErrors(error)).toEqual([
			{ field: "email", message: "already taken" },
		]);
	});

	it("falls back to the message when a detail carries only undecoded bytes", () => {
		// No `debug` — the detail's type was not registered, so connect could not
		// decode it. There is nothing to read, and the text convention is still
		// better than nothing.
		const error = new ConnectError("email: from text", Code.InvalidArgument);
		(error.details as unknown[]).push({
			type: "example.v1.SomethingUnregistered",
			value: new Uint8Array([10, 5]),
		});

		expect(extractFieldErrors(error)).toEqual([
			{ field: "email", message: "from text" },
		]);
	});
});
