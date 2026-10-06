import { afterEach, describe, expect, it, vi } from "vitest";

import { detectLocale, nextLocale } from "./locale-store";

function withLanguages(languages: readonly string[]) {
	vi.spyOn(navigator, "languages", "get").mockReturnValue([...languages]);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("detectLocale", () => {
	it("takes an exact match", () => {
		withLanguages(["ko-KR", "en-US"]);
		expect(detectLocale()).toBe("ko-KR");
	});

	// The case a full-tag comparison gets wrong, and the reason this matches on
	// the primary subtag: a British browser asks for `en-GB`, which is not a
	// locale we declare. Comparing whole tags would skip it and serve the
	// default — which happens to be English here, so the bug would stay
	// invisible until the second language shipped.
	it("matches on the primary subtag, so en-GB resolves to English", () => {
		withLanguages(["en-GB"]);
		expect(detectLocale()).toBe("en-US");
	});

	it("resolves a bare ko to the Korean locale", () => {
		withLanguages(["ko"]);
		expect(detectLocale()).toBe("ko-KR");
	});

	it("respects preference order", () => {
		withLanguages(["fr-FR", "ko-KR", "en-US"]);
		expect(detectLocale()).toBe("ko-KR");
	});

	it("falls back to the default when nothing is supported", () => {
		withLanguages(["fr-FR", "de-DE"]);
		expect(detectLocale()).toBe("en-US");
	});
});

describe("nextLocale", () => {
	it("switches English to Korean", () => {
		expect(nextLocale("en-US")).toBe("ko-KR");
	});

	it("switches Korean to English", () => {
		expect(nextLocale("ko-KR")).toBe("en-US");
	});
});
