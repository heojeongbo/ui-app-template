import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { queryClient } from "./query-client";
import { ThemeProvider } from "./theme-provider";

/**
 * Provider order, and why it is this order.
 *
 * ThemeProvider is OUTERMOST because it writes the `.dark` class on <html>,
 * which everything below — including anything portalled out of the React tree,
 * like a dialog or a toast — reads from the document rather than from context.
 * A theme provider nested inside would leave portalled content unthemed.
 *
 * QueryClientProvider comes next: the router's loaders reach the client
 * through router context rather than through React, so it only has to be above
 * the components that call hooks.
 *
 * RouterProvider is deliberately NOT here — it lives in main.tsx, because it
 * needs the session, and reading that inside a provider component would make
 * the whole tree re-render on every auth change instead of just the routes.
 */
export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ThemeProvider>
	);
}
