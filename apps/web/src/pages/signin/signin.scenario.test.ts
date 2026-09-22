import { describe, expect, it } from "vitest";

import { signInContent } from "./signin.content";
import { signInSchema } from "./signin.schema";

/**
 * Scenarios for ../../docs/screens/signin.md.
 *
 * Named `S<n>: <the sentence from the spec>` so `pnpm scenario:check` can hold
 * the two to each other — a scenario nobody tested and a test naming a
 * scenario nobody specified are both failures, and both are invisible to a
 * reader skimming either file alone.
 *
 * Nothing renders. The decisions this screen makes live in `signin.schema.ts`,
 * which is what lets them be asserted directly.
 */

const schema = signInSchema(signInContent);

/** The first issue is the only one a field renders. */
function firstMessage(values: { username: string; password: string }) {
	const result = schema.safeParse(values);
	return result.success ? null : result.error.issues[0]?.message;
}

describe("signInSchema", () => {
	it("S1: a blank username is reported as missing", () => {
		expect(firstMessage({ username: "", password: "hunter2" })).toBe(
			signInContent.usernameRequired,
		);
	});

	it("S2: a blank password is reported as missing, not as too short", () => {
		// zod does not short-circuit a chain, so the old `.min(8).min(1)` emitted
		// BOTH issues in chain order and the field rendered only the first. The
		// "required" message was unreachable, and someone who submitted nothing
		// was told their empty password was too short.
		expect(firstMessage({ username: "ada", password: "" })).toBe(
			signInContent.passwordRequired,
		);
	});

	it("S3: any non-empty password is accepted, however short", () => {
		// A sign-in form validates PRESENCE, never policy. A length minimum
		// belongs to the screen that creates a password; here it locks out
		// anyone whose password predates the current policy — the form refuses
		// before the server is ever asked, and no server-side migration can
		// rescue that account.
		expect(schema.safeParse({ username: "ada", password: "a" }).success).toBe(
			true,
		);
	});
});
