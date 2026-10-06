import { Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";
import { Separator } from "@template/design/ui/separator";
import { BoxIcon, HomeIcon, LogOutIcon, MoonIcon, SunIcon } from "lucide-react";
import { useIntlayer } from "react-intlayer";

import { useSessionStore } from "@/entities/session";
import { nextTheme, useThemeStore } from "@/shared/lib/theme";
import { LocaleToggle } from "@/shared/ui/locale-toggle";

import type { NavItemId } from "./nav-items";
import { NAV_ITEMS } from "./nav-items";

/**
 * The signed-in chrome.
 *
 * Rendered by the `(shell)` layout route, so which screens get it is decided
 * by the route tree rather than by a component inspecting the pathname.
 */
export function AppShell() {
	const signOut = useSessionStore((s) => s.signOut);

	return (
		<div className="flex min-h-svh">
			<Sidebar onSignOut={signOut} />
			<div className="flex min-w-0 flex-1 flex-col">
				<main className="min-w-0 flex-1">
					<Outlet />
				</main>
			</div>
		</div>
	);
}

const ICONS = { home: HomeIcon, items: BoxIcon } as const;

function Sidebar({ onSignOut }: { onSignOut: () => void }) {
	const matchRoute = useMatchRoute();
	const c = useIntlayer("app-shell");
	const app = useIntlayer("app");

	// Re-states the dictionary's own shape on the READ side, where the compiler
	// sees the GENERATED type rather than the declaration. One line instead of
	// a `?? ""` at the call site — and it stops compiling the day a nav entry
	// is added without its label.
	const navLabels = c.nav satisfies Record<NavItemId, unknown>;

	return (
		<nav
			aria-label={c.navLabel.value}
			className="flex w-56 shrink-0 flex-col gap-1 border-e bg-sidebar p-3"
		>
			<div className="px-2 py-3 font-semibold text-sidebar-foreground">
				{app.productName}
			</div>
			<Separator className="mb-2" />

			{NAV_ITEMS.map((item) => {
				const Icon = ICONS[item.id];
				// `useMatchRoute` and not a pathname comparison: it understands the
				// route tree, so a nested child still marks its parent active and a
				// path that merely shares a prefix does not.
				const active = Boolean(matchRoute({ to: item.to, fuzzy: true }));

				return (
					<Button
						key={item.id}
						asChild
						variant={active ? "secondary" : "ghost"}
						className="justify-start"
					>
						<Link to={item.to} aria-current={active ? "page" : undefined}>
							<Icon aria-hidden="true" />
							{navLabels[item.id]}
						</Link>
					</Button>
				);
			})}

			<div className="mt-auto flex flex-col gap-1">
				<LocaleToggle className="justify-start" />
				<ThemeToggle />
				<Button variant="ghost" className="justify-start" onClick={onSignOut}>
					<LogOutIcon aria-hidden="true" />
					{c.signOut}
				</Button>
			</div>
		</nav>
	);
}

/**
 * Both the icon and the words are keyed by the theme the button switches TO,
 * so they cannot disagree about which direction it goes.
 */
const TOGGLE_ICONS = { light: SunIcon, dark: MoonIcon } as const;

function ThemeToggle() {
	const c = useIntlayer("app-shell");
	const theme = useThemeStore((s) => s.theme);
	const setTheme = useThemeStore((s) => s.setTheme);
	// A decision, so it lives in a `.ts` where a test can reach it — see
	// `nextTheme` in shared/lib/theme.
	const next = nextTheme(theme);
	const Icon = TOGGLE_ICONS[next];

	return (
		<Button
			variant="ghost"
			className="justify-start"
			onClick={() => setTheme(next)}
		>
			<Icon aria-hidden="true" />
			{/*
				The label names what the button DOES, not the state it is in. "Dark
				mode" on a button that switches to light is the classic ambiguity.
				One whole sentence per destination, never assembled here: a frame
				with a word dropped into it is a frame no translation can reorder.
			*/}
			{c.themeToggle[next]}
		</Button>
	);
}
