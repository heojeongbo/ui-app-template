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

const runtimeConfigSchema = z.object({
	apiBaseUrl: z.string().optional(),
	logLevel: z.enum(["debug", "log", "info", "warn", "error"]).optional(),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

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
 */
export function readRuntimeConfig(): {
	config: RuntimeConfig;
	error?: string;
} {
	if (typeof window === "undefined" || window.__APP_CONFIG__ === undefined) {
		return { config: {} };
	}

	const result = runtimeConfigSchema.safeParse(window.__APP_CONFIG__);
	if (!result.success) {
		return {
			config: {},
			error: result.error.issues
				.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
				.join("; "),
		};
	}

	return { config: result.data };
}
