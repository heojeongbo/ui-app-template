import { describe, expect, it } from "vitest";

import { signInContent } from "./signin.content";
import { signInSchema } from "./signin.schema";

const schema = signInSchema(signInContent);

/** The first issue is the only one a field renders. */
function firstMessage(values: { username: string; password: string }) {
	const result = schema.safeParse(values);
	return result.success ? null : result.error.issues[0]?.message;
}

describe("signInSchema", () => {
	it("accepts any non-empty password, however short", () => {
		// The rule this pins: a sign-in form validates PRESENCE, never policy.
		// A length minimum belongs to the screen that creates a password. Here
		// it locks out anyone whose password predates the current policy — the
		// form refuses before the server is ever asked, and no server-side
		// migration can rescue that account.
		expect(schema.safeParse({ username: "ada", password: "a" }).success).toBe(
			true,
		);
	});

	it("says a blank password is missing, not too short", () => {
		// zod does not short-circuit a chain, so the old `.min(8).min(1)` emitted
		// BOTH issues in chain order and the field rendered only the first. The
		// "required" message was unreachable, and someone who submitted nothing
		// was told their empty password was too short.
		expect(firstMessage({ username: "ada", password: "" })).toBe(
			signInContent.passwordRequired,
		);
	});

	it("still requires a username", () => {
		expect(firstMessage({ username: "", password: "hunter2" })).toBe(
			signInContent.usernameRequired,
		);
	});
});
