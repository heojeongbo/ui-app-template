import { z } from "zod";

/**
 * Configuration a built artifact can be re-pointed with, without rebuilding.
 *
 * `import.meta.env.VITE_*` is **inlined by the bundler**, so a container image
 * built for staging is permanently a staging image — which is the opposite of
 * what an image is for. The fix is an ordinary script tag that runs before the
 * app bundle and sets a global:
 *
 *     <!-- index.html, BEFORE the module script -->
 *     <script src="/config.js"></script>
 *
 *     // public/config.js — rewritten by the container entrypoint at boot
 *     window.__APP_CONFIG__ = { apiBaseUrl: "https://api.example.com" }
 *
 * Deliberately a classic script, not a module: it must have executed before
 * the app's first import runs, and a module would be deferred.
 *
 * Precedence is runtime > build-time, because the runtime value is the one
 * someone set on purpose for *this* deployment.
 */

/**
 * A palette pushed from the server — a tenant's brand, a white-label build.
 *
 * Deliberately a loose `Record`, not a list of token names: this package has
 * no business knowing the design system's vocabulary, and hard-coding it here
 * would mean adding a token in two repos. `injectThemeTokens` validates the
 * keys and reports the ones it does not recognise.
 */
/**
 * A token VALUE, constrained to something that cannot escape the declaration
 * it will be written into.
 *
 * `injectThemeTokens` builds a stylesheet by concatenation —
 * `:root{--primary: <value>;}` — so a value containing `}` does not stay a
 * value. `"red} body{display:none"` produces:
 *
 *     :root{--primary: red} body{display:none;}
 *
 * which is a blank page from a typo'd brand config. Not XSS — a custom
 * property cannot run script, and the sheet is written with `textContent` so
 * `</style>` is inert — but "the app renders nothing" is not a better outcome
 * for having been an accident.
 *
 * Rejected rather than escaped. There is no legitimate CSS value containing
 * these characters here, so accepting and sanitising would only hide the
 * mistake from whoever has to fix it.
 */
const themeTokenValueSchema = z
	.string()
	.min(1)
	.refine((value) => !/[{};<>]/.test(value), {
		message: "must not contain { } ; < or >",
	});

const themeTokensSchema = z.record(z.string(), themeTokenValueSchema);

/**
 * The fields, kept as a map rather than a `z.object` so each can be parsed —
 * and rejected — on its own. See `readRuntimeConfig` for why that matters.
 */
const RUNTIME_CONFIG_FIELDS = {
	// `.min(1)`: an empty string is what an unset `APP_API_BASE_URL` produces,
	// and `baseUrl: ""` is not "use the default", it is a request to the page's
	// own origin.
	apiBaseUrl: z.string().min(1),
	logLevel: z.enum(["debug", "log", "info", "warn", "error"]),
	theme: z.object({
		light: themeTokensSchema.optional(),
		dark: themeTokensSchema.optional(),
	}),
} as const;

export type RuntimeConfig = {
	[K in keyof typeof RUNTIME_CONFIG_FIELDS]?: z.infer<
		(typeof RUNTIME_CONFIG_FIELDS)[K]
	>;
};

declare global {
	interface Window {
		__APP_CONFIG__?: unknown;
	}
}

/**
 * Read and validate the runtime config.
 *
 * Read lazily rather than at module scope so tests can set the global and so
 * importing this module has no ordering requirement of its own.
 *
 * A malformed config is ignored rather than fatal: it arrives from a file
 * someone edits by hand during a deploy, and refusing to boot the whole app
 * over a stray comma is worse than falling back to the build-time value. The
 * problem is logged instead — by the caller, which has the logger.
 *
 * **Per field, not all-or-nothing**, which is the same rule the URL schemas in
 * `shared/lib/search` follow and for the same reason: this file is hand-edited
 * at deploy time and outlives the code that reads it.
 *
 * A single `safeParse` over the whole object made one bad key discard every
 * good one. The realistic case is not hypothetical — `logLevel: "verbose"`
 * (plausible; it is not one of the five allowed) threw away a perfectly valid
 * `apiBaseUrl`, so the app silently fell back to the build-time URL and talked
 * to the WRONG BACKEND. Losing a log level is a nuisance; losing the API
 * address is an outage that looks like a code bug.
 *
 * Every rejected key is named in `error` so the nuisance is still visible.
 */
export function readRuntimeConfig(): {
	config: RuntimeConfig;
	error?: string;
} {
	if (typeof window === "undefined" || window.__APP_CONFIG__ === undefined) {
		return { config: {} };
	}

	const raw = window.__APP_CONFIG__;
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return { config: {}, error: "__APP_CONFIG__ is not an object" };
	}

	const source = raw as Record<string, unknown>;
	const config: Record<string, unknown> = {};
	const rejected: string[] = [];

	for (const [key, schema] of Object.entries(RUNTIME_CONFIG_FIELDS)) {
		const value = source[key];
		// Absent is not an error — every field is optional, and the whole point
		// of the file is to override only what this deployment cares about.
		if (value === undefined) continue;

		const result = schema.safeParse(value);
		if (result.success) {
			config[key] = result.data;
			continue;
		}

		rejected.push(
			result.error.issues
				.map((issue) => [key, ...issue.path].join(".") + `: ${issue.message}`)
				.join("; "),
		);
	}

	return rejected.length > 0
		? { config: config as RuntimeConfig, error: rejected.join("; ") }
		: { config: config as RuntimeConfig };
}
