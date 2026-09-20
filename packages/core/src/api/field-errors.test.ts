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
		(error.details as unknown[]).push({
			value: {
				fieldViolations: [{ field: "email", description: "from details" }],
			},
		});

		expect(extractFieldErrors(error)).toEqual([
			{ field: "email", message: "from details" },
		]);
	});
});
