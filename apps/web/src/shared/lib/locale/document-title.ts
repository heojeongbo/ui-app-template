import { getIntlayer } from "intlayer";

import type { Locale } from "./locale-store";
import { localeStore } from "./locale-store";

/**
 * The locale, for anything evaluated outside a render.
 *
 * A route's `head` is computed by the router, not by React, so `useIntlayer`
 * is unavailable there — and so is the provider's context. Reading the store
 * directly is the same escape hatch the transport interceptor uses, and it is
 * why the store rather than the provider is the source of truth.
 */
export function currentLocale(): Locale {
	return localeStore.getState().locale;
}

/**
 * A screen's browser-tab title.
 *
 * Takes the screen's own words rather than a dictionary key, so the route that
 * owns the screen also owns which of its strings is the title — and so this
 * helper needs no union of keys that would have to be kept in step with the
 * route tree.
 */
export function documentTitle(screen: string): string {
	return getIntlayer("app", currentLocale()).documentTitle({ screen });
}
