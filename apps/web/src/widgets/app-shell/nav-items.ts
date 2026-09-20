import { linkOptions } from "@tanstack/react-router";

/**
 * The navigation table.
 *
 * `linkOptions()` type-checks each entry AT ITS DECLARATION rather than where
 * it is spread into a `<Link>`. A route that is renamed or removed fails here,
 * on the line that names it, instead of producing a link that compiles and
 * 404s.
 *
 * `id` is what the icon map and (later) the i18n dictionary key off. Keying by
 * array position instead is how a reordered nav ends up with the wrong labels.
 */
export const NAV_ITEMS = [
	{ ...linkOptions({ to: "/" }), id: "home", label: "Home" },
	{ ...linkOptions({ to: "/items" }), id: "items", label: "Items" },
] as const;

export type NavItemId = (typeof NAV_ITEMS)[number]["id"];
