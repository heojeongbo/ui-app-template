import { describe, expect, it } from "vitest";

import { nextTheme } from "./theme-store";

describe("nextTheme", () => {
	it("switches dark to light", () => {
		expect(nextTheme("dark")).toBe("light");
	});

	it("switches light to dark", () => {
		expect(nextTheme("light")).toBe("dark");
	});

	// The case that was unreachable while this lived in JSX, and the one a user
	// hits first: the default preference is `system`, so the very first click
	// has to go somewhere. Falling through to "light" would make the button a
	// no-op for anyone on a light OS — it would "switch" to the theme already
	// on screen.
	it("switches system to dark, so the first click always changes something", () => {
		expect(nextTheme("system")).toBe("dark");
	});
});
