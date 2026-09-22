/**
 * Everything the 404 says.
 *
 * A `*.content.ts` beside a `shared/ui` component rather than only beside a
 * page, so the rule reads the same everywhere: a user-facing string lives in a
 * content module, wherever the component lives. The alternative is a reader
 * having to know which directories the convention applies to.
 *
 * The voice matters more here than almost anywhere else. This screen is
 * reached by people who are already lost, so it says what happened and offers
 * exactly one way out — "Go to the start", naming the destination rather than
 * "Back", which is what the browser button already does.
 */
export const routeNotFoundContent = {
	title: "Page not found",
	description: "The page you are looking for does not exist, or has moved.",
	goHome: "Go to the start",
} as const;

export type RouteNotFoundContent = typeof routeNotFoundContent;
