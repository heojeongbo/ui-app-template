/**
 * Mapping a server rejection back onto the fields that caused it.
 *
 * Client validation catches shape; only the server knows that a username is
 * taken or a date collides with an existing booking. Without this the user
 * gets a toast saying "Save failed" and has to guess which of nine fields to
 * change — which is where most forms quietly stop being usable.
 *
 * This module is deliberately transport-agnostic: it takes a list of
 * `{ field, message }` pairs, not a `ConnectError`. Extracting those pairs from
 * whatever your backend returns is the app's job (see
 * `packages/core/src/api/field-errors.ts` for the ConnectRPC extractor), and
 * keeping that split is what lets the design system stay unaware of the wire
 * format.
 */
import type { AnyFormApi } from "@tanstack/react-form";

/** One server-reported problem, addressed at a form field. */
export type ServerFieldError = {
	/**
	 * The field path as TanStack Form spells it: `"email"`, `"address.city"`,
	 * `"items[0].qty"`. A path that matches no field is reported back to the
	 * caller rather than dropped — see `applyServerFieldErrors`.
	 */
	field: string;
	message: string;
};

/**
 * TanStack's own type-erased form handle.
 *
 * A structural `{ setFieldMeta(field: string, ...) }` cannot accept a real
 * form: `setFieldMeta` narrows its first parameter to `DeepKeys<TFormData>`,
 * and a parameter accepting only `"email" | "username"` is not assignable to
 * one accepting any `string`. `AnyFormApi` is the escape hatch the library
 * provides for exactly this — helpers that address fields by runtime path.
 */

export type ApplyServerErrorsResult = {
	/** Paths that matched a field and were applied. */
	applied: string[];
	/**
	 * Paths with no matching field. The caller MUST surface these some other
	 * way — a form-level message or a toast. Silently dropping them is how a
	 * failed save looks like a successful one.
	 */
	unmatched: ServerFieldError[];
};

/**
 * Writes server errors into the form's `onServer` error slot.
 *
 * `onServer` is its own key rather than reusing `onChange`, so the next
 * keystroke's client validation replaces the client errors without wiping the
 * server's verdict, and vice versa.
 *
 * Fields are marked touched: an untouched field hides its error in most
 * designs, and an error the user cannot see is the bug this whole module
 * exists to prevent.
 */
export function applyServerFieldErrors(
	form: AnyFormApi,
	errors: readonly ServerFieldError[],
): ApplyServerErrorsResult {
	// Every MOUNTED field. A field inside a collapsed section that has never
	// rendered is not here, and its error correctly lands in `unmatched`.
	const known = new Set(Object.keys(form.state.fieldMeta));
	const applied: string[] = [];
	const unmatched: ServerFieldError[] = [];

	for (const error of errors) {
		if (!known.has(error.field)) {
			unmatched.push(error);
			continue;
		}

		form.setFieldMeta(error.field, (prev) => ({
			...prev,
			isTouched: true,
			errorMap: { ...prev.errorMap, onServer: error.message },
		}));
		applied.push(error.field);
	}

	return { applied, unmatched };
}

/**
 * Clears every `onServer` error.
 *
 * Call this at the START of a submit. A stale server error left in place makes
 * `canSubmit` false, so the second attempt never fires and the form appears
 * frozen — the failure mode that makes people give up on server-error mapping
 * and go back to toasts.
 */
export function clearServerFieldErrors(form: AnyFormApi): void {
	for (const field of Object.keys(form.state.fieldMeta)) {
		form.setFieldMeta(field, (prev) => {
			if (prev.errorMap.onServer === undefined) return prev;
			const { onServer: _dropped, ...rest } = prev.errorMap;
			return { ...prev, errorMap: rest };
		});
	}
}
