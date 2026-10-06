import { linkOptions } from "@tanstack/react-router";

/**
 * The navigation table.
 *
 * `linkOptions()` type-checks each entry AT ITS DECLARATION rather than where
 * it is spread into a `<Link>`. A route that is renamed or removed fails here,
 * on the line that names it, instead of producing a link that compiles and
 * 404s.
 *
 * `id` is what the icon map AND the content record key off — the labels live in
 * `app-shell.content.ts`, keyed by the same id. Keying by array position instead
 * is how a reordered nav ends up with the wrong word on every item.
 */
export const NAV_ITEMS = [
	{ ...linkOptions({ to: "/" }), id: "home" },
	{ ...linkOptions({ to: "/items" }), id: "items" },
] as const;

export type NavItemId = (typeof NAV_ITEMS)[number]["id"];
