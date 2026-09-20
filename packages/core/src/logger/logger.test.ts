/**
 * The logger's contract, including the two behaviours of the underlying
 * package that dictated this module's shape — both verified here rather than
 * taken on faith, because they are invisible from the call site.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	createScopedLogger,
	getLogLevel,
	initLogging,
	setLogLevel,
} from "./logger";

let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
	consoleSpies = (["debug", "log", "info", "warn", "error"] as const).map(
		(level) => vi.spyOn(console, level).mockImplementation(() => {}),
	);
	setLogLevel("debug");
});

afterEach(() => {
	for (const spy of consoleSpies) spy.mockRestore();
});

describe("createScopedLogger", () => {
	it("returns the same underlying logger for a scope", () => {
		// Registry-backed, so module-scope calls in several files do not
		// accumulate duplicates and HMR does not either.
		expect(createScopedLogger("Api").domain).toBe(
			createScopedLogger("Api").domain,
		);
	});

	it("emits through the console method matching the level", () => {
		createScopedLogger("Api").warn("transport closed");

		const warn = console.warn as unknown as ReturnType<typeof vi.fn>;
		expect(warn).toHaveBeenCalled();
		expect(String(warn.mock.calls[0]?.join(" "))).toContain("transport closed");
	});
});

describe("setLogLevel", () => {
	it("drops levels below the threshold", () => {
		const log = createScopedLogger("Api");
		setLogLevel("warn");

		log.debug("noisy");
		log.info("also noisy");
		log.error("real");

		expect(console.debug).not.toHaveBeenCalled();
		expect(console.info).not.toHaveBeenCalled();
		expect(console.error).toHaveBeenCalled();
	});

	it("reaches loggers created BEFORE it runs", () => {
		// This is the direction that works. The other direction is the trap
		// below, and the reason `initLogging` is called from the entry point.
		const log = createScopedLogger("Store");
		setLogLevel("error");

		log.info("dropped");

		expect(console.info).not.toHaveBeenCalled();
	});
});

describe("initLogging", () => {
	it("records the level so lazy() and the app agree on it", () => {
		initLogging({ level: "warn" });
		expect(getLogLevel()).toBe("warn");
	});

	it("does not silence warn and error the way disableAll() would", () => {
		// log-palette's README suggests `disableAll()` in production. That takes
		// the only signal a support engineer gets from a user's console with it.
		initLogging({ level: "warn" });
		const log = createScopedLogger("App");

		log.warn("degraded");
		log.error("failed");

		expect(console.warn).toHaveBeenCalled();
		expect(console.error).toHaveBeenCalled();
	});
});

describe("lazy", () => {
	it("does not build the payload when the level would drop it", () => {
		const build = vi.fn(() => ({ heavy: true }));
		const log = createScopedLogger("Query");
		setLogLevel("warn");

		log.lazy("debug", "cache reconciled", build);

		// The whole point: `log.debug("x", expensive())` evaluates `expensive()`
		// in production, because the level check happens inside the emit.
		expect(build).not.toHaveBeenCalled();
		expect(console.debug).not.toHaveBeenCalled();
	});

	it("builds and logs the payload when the level passes", () => {
		const build = vi.fn(() => ({ keys: ["a"] }));
		const log = createScopedLogger("Query");
		setLogLevel("debug");

		log.lazy("debug", "cache reconciled", build);

		expect(build).toHaveBeenCalledTimes(1);
		expect(console.debug).toHaveBeenCalled();
	});
});
