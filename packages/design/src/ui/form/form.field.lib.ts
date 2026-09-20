import type { HTMLInputTypeAttribute } from "react";

/**
 * Coerces a text-input value for the field: number inputs parse to a number
 * (empty string stays empty so the field can be cleared), everything else
 * passes through as-is.
 *
 * Without this a `type="number"` field feeds its zod schema a string, and
 * `z.number()` rejects a value the user can see is a number.
 */
export function coerceInputValue(
	value: string,
	type: HTMLInputTypeAttribute | undefined,
): string | number {
	if (type === "number") {
		return value === "" ? "" : Number(value);
	}
	return value;
}

/**
 * Reads a displayable message off whatever a validator produced.
 *
 * Standard Schema validators (zod, valibot, arktype) yield issue objects with
 * a `message`; a plain function validator may return a bare string. Reading
 * `.message` unconditionally renders "undefined" for the second kind — a bug
 * that only shows up the first time someone writes a one-off validator.
 */
export function errorMessage(error: unknown): string {
	if (error == null) return "";
	if (typeof error === "string") return error;
	if (typeof error === "object" && "message" in error) {
		const { message } = error as { message: unknown };
		return typeof message === "string" ? message : String(message);
	}
	return String(error);
}
