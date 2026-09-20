import { RouterProvider } from "@tanstack/react-router";
import { resolveLogLevel } from "@template/core/config";
import { exposeLoggingDevtools, initLogging } from "@template/core/logger";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app/providers/app-providers";
import { queryClient } from "@/app/providers/query-client";
import { createAppRouter } from "@/app/router";
import { useSessionStore } from "@/entities/session";
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
				Sibling of the router, not inside it: a toast has to survive the
				navigation that triggered it. Mounted once — a second Toaster
				renders every toast twice.
			*/}
			<Toaster />
		</AppProviders>
	</StrictMode>,
);
