import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { lazy, Suspense } from "react";

import type { RouterContext } from "@/app/router";
import { currentLocale } from "@/shared/lib/locale";

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
	/**
	 * The floor, not the title.
	 *
	 * Every screen overrides this with its own `head`. It exists so that a
	 * route which forgets one still shows the product name rather than an empty
	 * tab — a blank title reads as a broken page, and it is the kind of miss
	 * nothing else catches.
	 */
	head: () => ({
		meta: [{ title: getIntlayer("app", currentLocale()).productName }],
	}),

	component: RootLayout,
});

function RootLayout() {
	return (
		<>
			{/*
				Renders whatever the matched route's `head` returned. Without it the
				`head` options are computed and then dropped, which looks exactly
				like a title that "does not work".
			*/}
			<HeadContent />
			<Outlet />
			{Devtools ? (
				<Suspense fallback={null}>
					<Devtools />
				</Suspense>
			) : null}
		</>
	);
}
