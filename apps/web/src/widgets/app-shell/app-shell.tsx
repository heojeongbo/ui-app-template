import { Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";
import { Separator } from "@template/design/ui/separator";
import { BoxIcon, HomeIcon, LogOutIcon, MoonIcon, SunIcon } from "lucide-react";

import { useThemeStore } from "@/app/providers/theme-provider";
import { useSessionStore } from "@/entities/session";

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

	return (
		<nav
			aria-label="Main"
			className="flex w-56 shrink-0 flex-col gap-1 border-r bg-sidebar p-3"
		>
			<div className="px-2 py-3 font-semibold text-sidebar-foreground">
				ui-app-template
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
							{item.label}
						</Link>
					</Button>
				);
			})}

			<div className="mt-auto flex flex-col gap-1">
				<ThemeToggle />
				<Button variant="ghost" className="justify-start" onClick={onSignOut}>
					<LogOutIcon aria-hidden="true" />
					Sign out
				</Button>
			</div>
		</nav>
	);
}

function ThemeToggle() {
	const theme = useThemeStore((s) => s.theme);
	const setTheme = useThemeStore((s) => s.setTheme);
	const next = theme === "dark" ? "light" : "dark";

	return (
		<Button
			variant="ghost"
			className="justify-start"
			onClick={() => setTheme(next)}
		>
			{theme === "dark" ? (
				<SunIcon aria-hidden="true" />
			) : (
				<MoonIcon aria-hidden="true" />
			)}
			{/*
				The label names what the button DOES, not the state it is in. "Dark
				mode" on a button that switches to light is the classic ambiguity.
			*/}
			Switch to {next} mode
		</Button>
	);
}
