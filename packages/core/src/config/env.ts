import { z } from "zod";

import { readRuntimeConfig } from "./runtime-config";

/**
 * Typed, validated environment — parsed once, at module load.
 *
 * Reading `import.meta.env.VITE_X` raw at the point of use has two failure
 * modes this replaces:
 *
 * - A typo'd or missing variable is `undefined`, and the app boots and then
 *   fails somewhere far away ("Cannot read properties of undefined"). Parsing
 *   at load turns that into one legible error at startup.
 * - Everything is `string | undefined`, so every call site re-does its own
 *   coercion, and two of them disagree about what `"false"` means.
 *
 * Note that `import.meta.env.VITE_*` is **inlined at build time**. A value
 * that must differ per deployment of the same image cannot come from here —
 * see `runtime-config.ts`.
 */

const LOG_LEVELS = ["debug", "log", "info", "warn", "error"] as const;

/**
 * `z.stringbool()` and not `z.coerce.boolean()`. The latter applies JavaScript
 * truthiness, under which `"false"` and `"0"` are both `true` — a footgun that
 * reliably ships a debug flag enabled in production.
 */
const booleanFlag = z.stringbool().optional();

const envSchema = z.object({
	/**
	 * Where RPCs go. Same-origin by default so the session cookie flows.
	 *
	 * Blank-or-absent rather than `.default("/api")`, because `.default()` only
	 * fires on `undefined` and the realistic mistake writes an empty string:
	 * a `VITE_API_BASE_URL=` line with nothing after it, or a CI variable that
	 * was never populated. That is not "use the default" — it makes every RPC
	 * resolve against the current PAGE, so from `/items` the client posts to
	 * `/items/example.v1.ItemService/ListItems` and 404s in a way that reads as
	 * a routing problem rather than a configuration one.
	 *
	 * The trim is the same class of bug one step smaller: a trailing space in a
	 * `.env` file is invisible and produces a URL nothing will match.
	 */
	VITE_API_BASE_URL: z
		.string()
		.optional()
		.transform((value) => value?.trim() || "/api"),

	VITE_API_PROTOCOL: z.enum(["connect", "grpc-web"]).default("connect"),

	/**
	 * Optional so a dev build does not have to set it. The default is decided
	 * by `resolveLogLevel` below, which needs to know about PROD.
	 */
	VITE_LOG_LEVEL: z.enum(LOG_LEVELS).optional(),

	/** Turns on the dev-only RPC mocks. Off unless explicitly set. */
	VITE_ENABLE_MOCKS: booleanFlag,
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(raw: unknown): Env {
	const result = envSchema.safeParse(raw);

	if (!result.success) {
		const problems = result.error.issues
			.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
			.join("\n");
		// Thrown at import time on purpose. An app that boots with bad config and
		// fails later is far harder to diagnose than one that refuses to start.
		throw new Error(`Invalid environment configuration:\n${problems}`);
	}

	return result.data;
}

export const env: Env = parseEnv(import.meta.env);

/**
 * The log level to boot with.
 *
 * `warn` in production rather than silence: `error` and `warn` are the only
 * signal a support engineer gets from a user's console, and turning them off
 * is a decision that cannot be undone from the field.
 */
export function resolveLogLevel(): (typeof LOG_LEVELS)[number] {
	// Runtime first, for the same reason the transport reads it: the build-time
	// value is baked into the image, so raising the level on one deployment to
	// chase a bug would otherwise mean a rebuild.
	//
	// Safe to call here even though this runs before `initLogging` —
	// `readRuntimeConfig` does not log. Reporting a MALFORMED config does, and
	// that warning deliberately stays in the entry point, after the logger
	// exists.
	const runtime = readRuntimeConfig().config.logLevel;
	if (runtime) return runtime;

	if (env.VITE_LOG_LEVEL) return env.VITE_LOG_LEVEL;
	return import.meta.env.PROD ? "warn" : "debug";
}

/** Exported for tests, which need to parse a fixture rather than the real env. */
export const __testing = { parseEnv, envSchema };
