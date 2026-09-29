import { useMemo } from "react";

import { useLocaleStore } from "@/shared/lib/locale";

import { createFormatters, type Formatters } from "./formatters";

/**
 * The formatters for the language currently on screen.
 *
 * A zustand subscription, not `useSyncExternalStore`: the locale is
 * cross-cutting client state — the same home as the theme — rather than a
 * continuously-tracked external value like a socket or a media element. See
 * the three homes in CLAUDE.md.
 *
 * `useMemo` keeps the returned object referentially stable, so passing it as a
 * prop does not re-render a memoised child on every parent render.
 */
export function useFormatters(): Formatters {
	const locale = useLocaleStore((s) => s.locale);
	return useMemo(() => createFormatters(locale), [locale]);
}
