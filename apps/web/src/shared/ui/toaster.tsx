import { Toaster as DesignToaster } from "@template/design/ui/sonner";

import { useResolvedTheme } from "@/app/providers/theme-provider";

/**
 * The app's Toaster: the design system's, wired to this app's theme.
 *
 * The design system takes `theme` as a prop rather than reaching for a theme
 * library, so this three-line wrapper is the entire integration — and the
 * place any app-wide toast defaults would go.
 */
export function Toaster() {
	return <DesignToaster theme={useResolvedTheme()} />;
}
