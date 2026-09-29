import { DirectionProvider } from "@template/design/ui/direction";
import { getHTMLTextDir } from "intlayer";
import { type ReactNode, useEffect } from "react";
import { IntlayerProvider } from "react-intlayer";

import { useLocaleStore } from "@/shared/lib/locale";

/**
 * Applies the locale to the document, and hands it to everything that reads it
 * from context rather than from the store.
 *
 * Only the *application* lives here; the store itself is in
 * `shared/lib/locale` so that `shared/api/transport` can stamp
 * `Accept-Language` without importing from `app`, which would reverse the FSD
 * direction. Exactly the split `theme-provider.tsx` makes, for the same reason.
 *
 * Three consumers, three mechanisms, and they have to agree:
 *
 * - `<html lang>` is what a screen reader takes pronunciation from, and what
 *   `:lang()`, hyphenation and font fallback key off. A Korean page announced
 *   by an English voice is unintelligible, not merely wrong.
 * - `IntlayerProvider` is told the locale rather than detecting its own.
 *   Letting it persist independently gives two sources that disagree the first
 *   time someone clears localStorage but not the cookie.
 * - `DirectionProvider` is NOT redundant with `<html dir>`. Radix's
 *   `useDirection` resolves `localDir || globalDir || "ltr"` and never reads
 *   the document, so without this every popper, select and menu computes LTR
 *   placement on an RTL page. `sonner` is the opposite — it reads
 *   `document.documentElement.dir` itself, which is why the toaster needs
 *   nothing here and why the `dir` write below must not be "tidied away".
 *
 * It deliberately does NOT subscribe to `languagechange`. `ThemeProvider`
 * follows the OS only while the preference is literally `"system"`, because
 * following it unconditionally overrides an explicit choice; there is no
 * `"system"` locale here, so there is nothing to follow and a listener would
 * be exactly that bug. If a `"system"` option is ever added, it goes here
 * under the same guard.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
	const locale = useLocaleStore((s) => s.locale);
	const dir = getHTMLTextDir(locale);

	useEffect(() => {
		const root = document.documentElement;
		// index.html ships `lang="en-US" dir="ltr"` so the first paint is not
		// direction-less; this corrects it once the store has rehydrated.
		root.lang = locale;
		root.dir = dir;
	}, [locale, dir]);

	return (
		<DirectionProvider dir={dir === "rtl" ? "rtl" : "ltr"}>
			{/*
				`locale` only, no `setLocale`. Switching goes through the store — it
				is the source of truth, and the transport reads it outside React.
				Handing intlayer a setter would give the app two ways to change the
				language, one of which the interceptor cannot see.
			*/}
			<IntlayerProvider locale={locale}>{children}</IntlayerProvider>
		</DirectionProvider>
	);
}
