import { RouterProvider } from "@tanstack/react-router";
import { env, resolveLogLevel } from "@template/core/config";
import {
	createScopedLogger,
	exposeLoggingDevtools,
	initLogging,
} from "@template/core/logger";
import { StrictMode } from "react";
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
		// Clearing the session is enough — the router's guard re-runs because the
		// store changed, and performs the navigation itself.
		sessionStore.signOut();
	},
	interceptors: mocksEnabled ? mockInterceptors : [],
});

const router = createAppRouter(queryClient);

function App() {
	// Read here rather than inside a provider: the router context is what
	// guards depend on, and re-supplying it is what makes signing in or out
	// re-run every `beforeLoad` without rebuilding the router.
	const session = useSessionStore((s) => s.session);

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
