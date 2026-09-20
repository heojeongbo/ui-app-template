import { RouterProvider } from "@tanstack/react-router";
import { env, readRuntimeConfig, resolveLogLevel } from "@template/core/config";
import {
	createScopedLogger,
	exposeLoggingDevtools,
	initLogging,
} from "@template/core/logger";
import { injectThemeTokens } from "@template/design/lib/theme";
import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { mockInterceptors } from "@/app/mocks";
import { AppProviders } from "@/app/providers/app-providers";
import { queryClient } from "@/app/providers/query-client";
import { createAppRouter } from "@/app/router";
import { sessionStore, useSessionStore } from "@/entities/session";
import { configureTransport } from "@/shared/api";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Toaster } from "@/shared/ui/toaster";

import "@/app/style.css";

/**
 * FIRST statement, before anything else is imported for its side effects.
 *
 * `setGlobalLevel` only reaches loggers that already exist in log-palette's
 * registry — a logger created after it runs keeps its own level. Calling this
 * at the top of the entry point is what guarantees every module-scope logger
 * in the app has been created by the time the level is applied.
 */
initLogging({ level: resolveLogLevel() });

if (import.meta.env.DEV) {
	// `__log.setLevel("debug")` from the DevTools console while reproducing a
	// bug beats redeploying with a changed constant.
	exposeLoggingDevtools();
}

/**
 * Compose the transport here, in `app`, and inject it downward.
 *
 * The two things it needs — how to sign out, and which RPCs are mocked — are
 * app-layer knowledge, and `shared/api` must not reach up for them. It builds
 * lazily on the first real request, which happens long after this line.
 */
/**
 * A palette pushed from the server, applied before the first paint.
 *
 * Most theming belongs in `src/app/theme.css`, which costs nothing at runtime.
 * This path is for a palette that is not known at build time — a tenant's
 * brand colours in a multi-tenant deployment.
 *
 * Before `createRoot`, so the tokens are in place when the first frame
 * renders; after it, the default palette paints and is then replaced, which
 * reads as a flash.
 */
const runtime = readRuntimeConfig();
if (runtime.error) {
	createScopedLogger("App").warn("ignoring malformed config.js", {
		reason: runtime.error,
	});
}
if (runtime.config.theme) {
	const { unknown } = injectThemeTokens(runtime.config.theme);
	if (unknown.length > 0) {
		// A key the design system does not recognise is a colour that silently
		// does not change — indistinguishable from one that was already right.
		createScopedLogger("App").warn("unknown theme tokens in config.js", {
			unknown,
		});
	}
}

const mocksEnabled = env.VITE_ENABLE_MOCKS === true;

if (mocksEnabled) {
	// Gated on the explicit flag ALONE, not on `import.meta.env.DEV`.
	//
	// Requiring a dev build sounds safer and makes the flag useless for its
	// main job: the e2e suite runs against a real production bundle, because
	// that is what ships. Adding `&& DEV` silently disabled every mock there,
	// and the whole suite failed with HTTP 404s that looked like a Playwright
	// problem.
	//
	// The safety is that the flag is off unless someone sets it, plus this
	// warning — which is unconditional and at `warn`, so it survives the
	// production log level and is the first thing in the console if a build
	// ever ships with it on.
	createScopedLogger("App").warn(
		"RPC mocks are ENABLED. No request reaches a server; every response is a fixture.",
	);
}

configureTransport({
	onUnauthenticated: () => {
		// Clearing the session is enough. `App` watches it and invalidates the
		// router, which re-runs `beforeLoad` — and the guard performs the
		// navigation. No imperative `router.navigate` from outside React.
		sessionStore.signOut();
	},
	interceptors: mocksEnabled ? mockInterceptors : [],
});

const router = createAppRouter(queryClient);

function App() {
	// Read here rather than inside a provider: the router context is what
	// guards depend on, and it is re-supplied on every session change.
	const session = useSessionStore((s) => s.session);

	/**
	 * Re-run the guards when the session changes.
	 *
	 * Supplying a new `context` re-renders, but it does **not** re-run
	 * `beforeLoad` — those run on navigation, and the current route stays
	 * matched. Without this, signing out leaves the user sitting on the
	 * protected page with their data still on screen, and only a manual
	 * navigation ejects them. Caught by the journey e2e; every isolated test
	 * signs in and never signs out, so none of them could see it.
	 *
	 * `invalidate()` re-runs `beforeLoad` and the loaders for the current
	 * matches. On sign-out the guard throws its redirect; on sign-in the
	 * loaders refetch what the user is now entitled to.
	 *
	 * It MUST be an effect on `session`, not a store subscription. A zustand
	 * listener fires synchronously inside `set()`, before React re-renders —
	 * so `RouterProvider` has not yet pushed the new context, and `invalidate`
	 * re-runs the guard against the session that is on its way out. The guard
	 * passes, and nothing happens. Tried it; the journey test caught it.
	 */
	const mounted = useRef(false);

	// The lint below is correct that `session` is never read in the body, and
	// wrong that it is therefore unnecessary: it is a SEQUENCING requirement.
	// The effect has to run after the render that hands the new session to
	// RouterProvider, and with an empty array it would fire once and never
	// again. (A `biome-ignore` reason has to fit on its own line, hence this
	// note sitting above it.)
	// biome-ignore lint/correctness/useExhaustiveDependencies: sequencing, not a read — see above
	useEffect(() => {
		// Skip the mount run: the initial render already evaluated the guards,
		// and invalidating here would refetch every loader before first paint.
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		void router.invalidate();
	}, [session]);

	return <RouterProvider router={router} context={{ session }} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error(
		"No #root element. Check index.html — the mount point is what main.tsx renders into.",
	);
}

createRoot(rootElement).render(
	<StrictMode>
		<AppProviders>
			<App />
			{/*
				Siblings of the router, not inside it: a toast has to survive the
				navigation that triggered it, and a confirmation has to outlive the
				component that asked for it. Both mounted exactly once — a second
				Toaster renders every toast twice, and a second ConfirmDialog would
				answer the same promise twice.
			*/}
			<Toaster />
			<ConfirmDialog />
		</AppProviders>
	</StrictMode>,
);
