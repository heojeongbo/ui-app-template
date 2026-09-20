import { Code, ConnectError } from "@connectrpc/connect";
import { describe, expect, it } from "vitest";

import {
	isAbortError,
	isDefiniteFailure,
	isUnauthenticated,
	shouldRetry,
	toUserMessage,
} from "./errors";

describe("isDefiniteFailure", () => {
	it.each([
		Code.InvalidArgument,
		Code.NotFound,
		Code.AlreadyExists,
		Code.PermissionDenied,
		Code.Unauthenticated,
		Code.Unimplemented,
		Code.FailedPrecondition,
		Code.OutOfRange,
	])("is true for code %i — the server gave a verdict", (code) => {
		expect(isDefiniteFailure(new ConnectError("nope", code))).toBe(true);
	});

	it.each([
		Code.Unavailable,
		Code.DeadlineExceeded,
		Code.Internal,
		Code.Unknown,
		Code.Aborted,
		Code.ResourceExhausted,
		Code.DataLoss,
	])("is false for code %i — the answer may simply be lost", (code) => {
		// Reporting these as failures is how a user is told "Save failed" for a
		// write that landed, and then creates a duplicate by retrying.
		expect(isDefiniteFailure(new ConnectError("nope", code))).toBe(false);
	});

	it("is false for a plain network error", () => {
		expect(isDefiniteFailure(new TypeError("fetch failed"))).toBe(false);
	});
});

describe("isAbortError", () => {
	it("recognises a cancelled Connect call", () => {
		expect(isAbortError(new ConnectError("gone", Code.Canceled))).toBe(true);
	});

	it("recognises a DOM abort", () => {
		expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
	});

	it("recognises a plain Error named AbortError", () => {
		// Not every runtime rejects with a DOMException.
		const error = new Error("aborted");
		error.name = "AbortError";
		expect(isAbortError(error)).toBe(true);
	});

	it("is false for a real failure", () => {
		expect(isAbortError(new ConnectError("nope", Code.Internal))).toBe(false);
	});
});

describe("isUnauthenticated", () => {
	it("is true only for Unauthenticated", () => {
		expect(isUnauthenticated(new ConnectError("x", Code.Unauthenticated))).toBe(
			true,
		);
		// PermissionDenied is deliberately NOT global: the user is signed in and
		// simply may not do this. Kicking them to /signin would be wrong.
		expect(
			isUnauthenticated(new ConnectError("x", Code.PermissionDenied)),
		).toBe(false);
	});
});

describe("shouldRetry", () => {
	it("never retries a definite failure", () => {
		// The server already answered and will answer the same way; retrying is
		// pure added latency before the user sees the message.
		expect(shouldRetry(0, new ConnectError("x", Code.InvalidArgument))).toBe(
			false,
		);
	});

	it("never retries an abort", () => {
		expect(shouldRetry(0, new ConnectError("x", Code.Canceled))).toBe(false);
	});

	it("retries an indeterminate failure up to the cap", () => {
		const error = new ConnectError("x", Code.Unavailable);
		expect(shouldRetry(0, error)).toBe(true);
		expect(shouldRetry(1, error)).toBe(true);
		expect(shouldRetry(2, error)).toBe(false);
	});
});

describe("toUserMessage", () => {
	it("passes the server's own wording through for a definite failure", () => {
		expect(
			toUserMessage(
				new ConnectError("That name is already taken", Code.AlreadyExists),
				"Could not save",
			),
		).toBe("That name is already taken");
	});

	it("falls back for an indeterminate failure", () => {
		// `error.message` here is transport detail — "fetch failed" tells a user
		// nothing and reads as a bug.
		expect(
			toUserMessage(
				new TypeError("fetch failed"),
				"Could not reach the server",
			),
		).toBe("Could not reach the server");
	});

	it("falls back when the server sent an empty message", () => {
		expect(
			toUserMessage(
				new ConnectError("", Code.InvalidArgument),
				"Check the form",
			),
		).toBe("Check the form");
	});
});
