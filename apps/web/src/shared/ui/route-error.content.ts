/**
 * Everything the route error surface says.
 *
 * Two distinct messages for two distinct situations, and keeping them apart is
 * the point of the module rather than an accident of extraction:
 *
 * - `fallbackDescription` is used only when the error carries nothing a human
 *   wrote. An indeterminate failure's own message is transport detail
 *   ("fetch failed"), which tells a user nothing and reads as a bug.
 * - `definiteNote` appears only for a failure the server already ruled on.
 *   Without it the retry button invites the user to press it three times to
 *   discover that the answer will not change.
 */
export const routeErrorContent = {
	title: "Could not load this page",
	fallbackDescription: "Something went wrong loading this page.",
	retry: "Try again",
	definiteNote:
		"This is unlikely to resolve on its own. If it persists, the request may no longer be valid.",
} as const;

export type RouteErrorContent = typeof routeErrorContent;
