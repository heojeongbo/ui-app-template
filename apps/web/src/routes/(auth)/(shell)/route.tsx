import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/widgets/app-shell";

/**
 * The signed-in chrome: sidebar, header, content well.
 *
 * A second pathless group under `(auth)`, so a full-bleed screen — a map, a
 * report viewer — can live in a sibling `(full)` group and opt out of the
 * shell entirely without any component asking "which page am I on".
 */
export const Route = createFileRoute("/(auth)/(shell)")({
	component: AppShell,
});
