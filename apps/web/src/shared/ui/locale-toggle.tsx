import { Button } from "@template/design/ui/button";
import { LanguagesIcon } from "lucide-react";
import { useIntlayer } from "react-intlayer";

import { type Locale, nextLocale, useLocaleStore } from "@/shared/lib/locale";

/**
 * Switches the language.
 *
 * In `shared/ui` rather than in the app shell because it has to appear on the
 * SIGN-IN page as well: a switcher that only exists behind authentication is
 * unreachable to the person most likely to need it.
 *
 * A toggle rather than a picker because there are exactly two locales. The
 * decision itself lives in `nextLocale` — a `.ts` a scenario test can reach —
 * and the day a third locale ships, that function is what tells you every call
 * site to change.
 */
export function LocaleToggle({ className }: { className?: string }) {
	const c = useIntlayer("common");
	const locale = useLocaleStore((s) => s.locale);
	const setLocale = useLocaleStore((s) => s.setLocale);
	const next = nextLocale(locale);

	// Re-stated where the compiler sees the GENERATED type: a locale added to
	// LOCALES without a label fails here rather than rendering a blank button.
	const labels = c.localeToggle satisfies Record<Locale, unknown>;

	return (
		<Button
			variant="ghost"
			className={className}
			onClick={() => setLocale(next)}
		>
			<LanguagesIcon aria-hidden="true" />
			{labels[next]}
		</Button>
	);
}
