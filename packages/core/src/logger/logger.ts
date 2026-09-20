import {
	configure,
	disableAll,
	enableAll,
	getAllLoggers,
	getLogger,
	type Logger,
	type LogLevel,
	setGlobalLevel,
} from "@heojeongbo/log-palette";

/**
 * The application's logging surface.
 *
 * Everything about this module's shape is a consequence of how log-palette
 * actually behaves, verified against 0.2.2:
 *
 * - **`configure()` is a module-level side effect read at LOG time**, not at
 *   logger-creation time. A logger created in a module that does not
 *   transitively import this one renders at a different prefix width, so the
 *   badge column stops lining up. Centralising every logger here makes that
 *   impossible rather than merely discouraged.
 *
 * - **Only `getLogger()` instances enter the registry.** `createLogger()` also
 *   exists and looks equivalent, but `setGlobalLevel` / `enableAll` /
 *   `disableAll` iterate the registry only — so an app built on `createLogger`
 *   has no runtime control over its own logging at all.
 *
 * - **`setGlobalLevel` does not affect loggers created after it runs.** Hence
 *   `initLogging()`: it must be called from the entry point AFTER this module
 *   has been imported, which is automatic because calling it imports it.
 *
 * Nothing outside this directory imports `@heojeongbo/log-palette` — a Biome
 * `noRestrictedImports` rule enforces it. The indirection is cheap and it is
 * what makes adding a remote sink, or replacing a pre-1.0 dependency, a
 * one-file change.
 */

/**
 * Log scopes, as a closed union rather than free-form strings.
 *
 * A union stops names drifting (`"Api"` vs `"API"` vs `"api"` would be three
 * colours for one subsystem), makes `grep` reliable, and keeps every badge
 * within `innerWidth` so the column never jitters.
 *
 * Add a scope here when you add a subsystem. Keep it <= 8 characters: longer
 * names are truncated with an ellipsis, which reads as a typo.
 */
export type LogScope =
	| "App"
	| "Api"
	| "Auth"
	| "Router"
	| "Query"
	| "Form"
	| "Store";

/** Re-exported so callers never import the underlying package directly. */
export type { Logger, LogLevel };

/**
 * Ordering, lowest to highest. Mirrors log-palette's own comparison so `lazy`
 * can decide whether a call will emit before paying to build its arguments.
 */
const LEVEL_RANK: Record<LogLevel, number> = {
	debug: 0,
	log: 1,
	info: 2,
	warn: 3,
	error: 4,
};

/**
 * 8 inner characters. Long enough for the scopes above plus the ones an app
 * adds, short enough that the message column starts early.
 */
configure({ innerWidth: 8, timestamp: true });

let currentLevel: LogLevel = "debug";

export interface ScopedLogger extends Logger {
	/**
	 * Log without paying for the payload when the level would drop it.
	 *
	 * `enabled` and `level` are checked INSIDE log-palette's emit function, so
	 * `log.debug("state", serialiseEverything(x))` evaluates its argument in
	 * production even though nothing is printed. Anything more expensive than
	 * passing a reference belongs here instead:
	 *
	 *     log.lazy("debug", "cache reconciled", () => ({ keys: [...cache.keys()] }))
	 */
	lazy(level: LogLevel, message: string, build: () => unknown): void;
}

/**
 * Get the logger for a scope. Idempotent — the same scope always yields the
 * same instance, so calling this at module scope in several files is fine and
 * survives HMR without accumulating duplicates.
 */
export function createScopedLogger(scope: LogScope): ScopedLogger {
	const base = getLogger(scope);

	const lazy: ScopedLogger["lazy"] = (level, message, build) => {
		if (LEVEL_RANK[level] < LEVEL_RANK[currentLevel]) return;
		base[level](message, build());
	};

	// Spread rather than subclass: log-palette returns a plain object whose
	// methods are already bound, and `Object.assign` onto it would mutate the
	// registry's shared instance.
	return Object.assign(Object.create(base) as Logger, { lazy });
}

/**
 * Apply the runtime log level. Call this as the FIRST statement of the app
 * entry point.
 *
 * The level comes from the caller rather than from `import.meta.env` so this
 * package stays free of build-tool globals and the app's typed env module
 * remains the single place environment variables are read.
 *
 * Note what this deliberately does NOT do: log-palette's README suggests
 * `disableAll()` in production. That silences `error` and `warn` too, which
 * removes the only signal a support engineer has from a user's console. A
 * level of `warn` is the right production default.
 */
export function initLogging({ level }: { level: LogLevel }): void {
	setLogLevel(level);
}

/** Change the level at runtime. Affects every scope. */
export function setLogLevel(level: LogLevel): void {
	currentLevel = level;
	setGlobalLevel(level);
}

/** The current level. Exposed mainly so `lazy` and tests can agree on it. */
export function getLogLevel(): LogLevel {
	return currentLevel;
}

/**
 * Put the logging controls on `globalThis.__log` so they can be driven from
 * the DevTools console: `__log.setLevel("debug")` while reproducing a bug
 * beats redeploying with a changed constant.
 *
 * This is the payoff for using `getLogger` over `createLogger` — the registry
 * is what makes `setLevel` reach loggers the console never had a handle on.
 *
 * Call it from the app entry point behind a DEV guard; this package does not
 * read build-tool globals of its own.
 */
export function exposeLoggingDevtools(): void {
	// Bracket access, not `.__log`: `noPropertyAccessFromIndexSignature` draws
	// the line between a property a type declares and one it merely permits,
	// and this is the second kind — we are adding a key to `globalThis`, not
	// reading one it promised.
	(globalThis as unknown as Record<string, unknown>)["__log"] = {
		setLevel: setLogLevel,
		getLevel: getLogLevel,
		scopes: () => [...getAllLoggers().keys()],
		enableAll,
		disableAll,
	};
}
