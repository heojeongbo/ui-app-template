import { date, number } from "intlayer";

import type { Locale } from "@/shared/lib/locale";

/**
 * Locale-aware formatting, as a closed set of named presets.
 *
 * **A closed set, not an options object**, and that is the load-bearing
 * decision. It is the design system's own rule transposed from CSS to
 * formatting: "a recurring per-page tweak is a new `cva` variant, not a
 * `className` at the call site" (docs/design-system.md). Twelve screens cannot
 * independently choose between a short date and a medium one, and the set
 * stays reviewable — which an `Intl.DateTimeFormatOptions` passed at each call
 * site never is.
 *
 * It wraps intlayer's formatters rather than `Intl` directly. They are already
 * locale-injected and already cache their `Intl.*` instances, and building a
 * second cache in `packages/core` would also put an intlayer dependency in a
 * package whose whole value is that it has none — which is what keeps the
 * blast radius of the i18n decision inside `apps/web`.
 */
export type Formatters = {
	/** A calendar date: `Jan 1, 2026` / `2026. 1. 1.` */
	date: (value: Date) => string;
	/** A date and a time of day, for a tooltip or a detail line. */
	dateTime: (value: Date) => string;
	/** A whole number, grouped: `1,234` / `1 234`. */
	integer: (value: number) => string;
};

/**
 * Build formatters bound to one locale.
 *
 * Pure and explicit, so a unit test supplies the locale rather than inheriting
 * the machine's — which is the difference between a test that fails in CI and
 * one that fails only on someone's laptop.
 */
export function createFormatters(locale: Locale): Formatters {
	return {
		date: (value) => date(value, { locale, dateStyle: "medium" }),
		dateTime: (value) =>
			date(value, { locale, dateStyle: "medium", timeStyle: "short" }),
		integer: (value) => number(value, { locale, maximumFractionDigits: 0 }),
	};
}
