import { describe, expect, it } from "vitest";

import { coerceInputValue, errorMessage } from "./form.field.lib";

describe("coerceInputValue", () => {
	it("parses a number input to a number", () => {
		// Without this, `z.number()` rejects a value the user can see is numeric.
		expect(coerceInputValue("42", "number")).toBe(42);
		expect(coerceInputValue("-1.5", "number")).toBe(-1.5);
	});

	it("keeps an emptied number input as an empty string", () => {
		// Coercing "" to 0 would make the field unclearable: the user deletes the
		// digits and a 0 appears.
		expect(coerceInputValue("", "number")).toBe("");
	});

	it("passes non-number inputs through untouched", () => {
		expect(coerceInputValue("42", "text")).toBe("42");
		expect(coerceInputValue("42", undefined)).toBe("42");
		expect(coerceInputValue("a@b.com", "email")).toBe("a@b.com");
	});
});

describe("errorMessage", () => {
	it("reads .message off a Standard Schema issue", () => {
		expect(errorMessage({ message: "Required" })).toBe("Required");
	});

	it("accepts a bare string from a plain function validator", () => {
		// Reading `.message` unconditionally renders "undefined" here — the bug
		// this function exists to prevent.
		expect(errorMessage("Required")).toBe("Required");
	});

	it("renders nothing for a null-ish error", () => {
		expect(errorMessage(null)).toBe("");
		expect(errorMessage(undefined)).toBe("");
	});
});
