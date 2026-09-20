/**
 * The tokens a consumer may override, as a value rather than a comment.
 *
 * This list is the contract between `theme.css` (build-time) and
 * `injectThemeTokens` (runtime). Having it in one place means a typo in a
 * runtime payload is a **type error**, not a CSS variable that silently
 * resolves to nothing and renders a transparent button.
 *
 * Add a token here when you add one to `inline.css`. The two must agree — a
 * token that exists here but is not mapped in `@theme inline` has no utility,
 * and one mapped there but missing here cannot be set at runtime.
 */
export const THEME_TOKENS = [
	"radius",

	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",

	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",

	"border",
	"input",
	"ring",

	"success",
	"success-foreground",
	"success-surface",
	"info",
	"info-foreground",
	"info-surface",
	"warning",
	"warning-foreground",
	"warning-surface",
	"danger",
	"danger-foreground",
	"danger-surface",
	"destructive",
	"destructive-foreground",

	"chart-1",
	"chart-2",
	"chart-3",
	"chart-4",
	"chart-5",

	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"sidebar-accent",
	"sidebar-accent-foreground",
	"sidebar-border",
	"sidebar-ring",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

/** A partial palette. Omitted tokens keep their stylesheet value. */
export type ThemeTokens = Partial<Record<ThemeToken, string>>;

/** Light and dark, which is how a palette is always actually specified. */
export type ThemeOverride = {
	light?: ThemeTokens;
	dark?: ThemeTokens;
};

const TOKEN_SET: ReadonlySet<string> = new Set(THEME_TOKENS);

export function isThemeToken(value: string): value is ThemeToken {
	return TOKEN_SET.has(value);
}
