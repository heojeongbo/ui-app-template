import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import type { RouterContext } from "@/app/router";

/**
 * Devtools, lazily and only in dev.
 *
 * A static import would put them in the production bundle and rely on
 * tree-shaking to get them back out — which works until it doesn't, and the
 * failure is silent weight rather than a broken build. A dynamic import that
 * is never reached is never fetched.
 */
const Devtools = import.meta.env.DEV
	? lazy(async () => {
			const [router, query] = await Promise.all([
				import("@tanstack/react-router-devtools"),
				import("@tanstack/react-query-devtools"),
			]);
			return {
				default: () => (
					<>
						<router.TanStackRouterDevtools position="bottom-right" />
						<query.ReactQueryDevtools buttonPosition="bottom-left" />
					</>
				),
			};
		})
	: null;

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

function RootLayout() {
	return (
		<>
			<Outlet />
			{Devtools ? (
				<Suspense fallback={null}>
					<Devtools />
				</Suspense>
			) : null}
		</>
	);
}
