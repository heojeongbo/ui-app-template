import { afterEach, describe, expect, it } from "vitest";

import { __testing } from "./env";
import { readRuntimeConfig } from "./runtime-config";

const { parseEnv } = __testing;

describe("env", () => {
	it("applies defaults for anything unset", () => {
		const env = parseEnv({});
		expect(env.VITE_API_BASE_URL).toBe("/api");
		expect(env.VITE_API_PROTOCOL).toBe("connect");
	});

	it("treats a blank API base URL as unset, not as the page's own origin", () => {
		// `.default()` fires only on `undefined`, so `VITE_API_BASE_URL=` with
		// nothing after it used to survive as `""` — which resolves every RPC
		// against the CURRENT PAGE. From `/items` the client posts to
		// `/items/example.v1.ItemService/ListItems`, and the 404 reads as a
		// routing bug rather than a missing variable.
		expect(parseEnv({ VITE_API_BASE_URL: "" }).VITE_API_BASE_URL).toBe("/api");
		expect(parseEnv({ VITE_API_BASE_URL: "   " }).VITE_API_BASE_URL).toBe(
			"/api",
		);
	});

	it("trims a stray space out of the API base URL", () => {
		// Invisible in a .env file, and produces a URL nothing matches.
		expect(
			parseEnv({ VITE_API_BASE_URL: "  https://api.example.com  " })
				.VITE_API_BASE_URL,
		).toBe("https://api.example.com");
	});

	it("rejects an unknown protocol at load rather than at first request", () => {
		expect(() => parseEnv({ VITE_API_PROTOCOL: "graphql" })).toThrow(
			/VITE_API_PROTOCOL/,
		);
	});

	it('treats "false" and "0" as false', () => {
		// `z.coerce.boolean()` applies JS truthiness, under which both are TRUE —
		// which is how a debug flag ships enabled in production.
		expect(parseEnv({ VITE_ENABLE_MOCKS: "false" }).VITE_ENABLE_MOCKS).toBe(
			false,
		);
		expect(parseEnv({ VITE_ENABLE_MOCKS: "0" }).VITE_ENABLE_MOCKS).toBe(false);
		expect(parseEnv({ VITE_ENABLE_MOCKS: "true" }).VITE_ENABLE_MOCKS).toBe(
			true,
		);
	});

	it("names the offending variable in the error", () => {
		// The whole value of parsing at load is a legible message; "Cannot read
		// properties of undefined" three modules away is what it replaces.
		expect(() => parseEnv({ VITE_LOG_LEVEL: "verbose" })).toThrow(
			/VITE_LOG_LEVEL/,
		);
	});
});

describe("readRuntimeConfig", () => {
	afterEach(() => {
		window.__APP_CONFIG__ = undefined;
	});

	it("returns an empty config when the global is absent", () => {
		expect(readRuntimeConfig()).toEqual({ config: {} });
	});

	it("reads a valid config", () => {
		window.__APP_CONFIG__ = { apiBaseUrl: "https://api.example.com" };
		expect(readRuntimeConfig().config.apiBaseUrl).toBe(
			"https://api.example.com",
		);
	});

	it("falls back instead of refusing to boot on a malformed config", () => {
		// config.js is edited by hand during a deploy. Failing the whole app over
		// a stray value is worse than using the build-time default and saying so.
		window.__APP_CONFIG__ = { apiBaseUrl: 42 };

		const { config, error } = readRuntimeConfig();
		expect(config).toEqual({});
		expect(error).toMatch(/apiBaseUrl/);
	});

	it("reports an entirely wrong shape rather than throwing", () => {
		window.__APP_CONFIG__ = "oops";
		expect(readRuntimeConfig().error).toBeTruthy();
	});

	it("keeps the good keys when one is bad", () => {
		// The regression. A single `safeParse` over the whole object discarded
		// every valid key alongside the invalid one, so a typo'd log level threw
		// away the API address and the app silently talked to the build-time
		// backend — an outage that presents as a code bug.
		//
		// "verbose" is the realistic mistake: a real level name in most logging
		// libraries, and not one of the five this one allows.
		window.__APP_CONFIG__ = {
			apiBaseUrl: "https://api.prod.example.com",
			logLevel: "verbose",
		};

		const { config, error } = readRuntimeConfig();
		expect(config.apiBaseUrl).toBe("https://api.prod.example.com");
		expect(config.logLevel).toBeUndefined();
		// Still reported — salvaging the rest must not make the mistake silent.
		expect(error).toMatch(/logLevel/);
	});

	it("rejects an empty apiBaseUrl rather than treating it as unset", () => {
		// What an unset `APP_API_BASE_URL` writes into config.js. `baseUrl: ""`
		// is not "use the default" — it points every RPC at the page's own
		// origin, which 404s in a way that looks like a routing problem.
		window.__APP_CONFIG__ = { apiBaseUrl: "" };

		const { config, error } = readRuntimeConfig();
		expect(config.apiBaseUrl).toBeUndefined();
		expect(error).toMatch(/apiBaseUrl/);
	});

	it("refuses a theme value that could escape its CSS declaration", () => {
		// Second gate. `injectThemeTokens` has its own check, but rejecting at
		// the boundary is what names the deployment file in the error.
		window.__APP_CONFIG__ = {
			apiBaseUrl: "https://api.example.com",
			theme: { light: { primary: "red} body{display:none" } },
		};

		const { config, error } = readRuntimeConfig();
		expect(config.theme).toBeUndefined();
		expect(error).toMatch(/theme/);
		// And the unrelated key survives it.
		expect(config.apiBaseUrl).toBe("https://api.example.com");
	});
});
