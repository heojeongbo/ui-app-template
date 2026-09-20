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
});
