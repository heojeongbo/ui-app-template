import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * The toast surface. Owned outright rather than installed.
 *
 * shadcn's `sonner` component calls `useTheme()` from `next-themes`. Taking it
 * unchanged means either adding a theme library this template does not use, or
 * shipping the bug that library causes when nobody mounts its provider: the
 * hook falls back to `"system"` forever, so the toaster ignores the app's own
 * theme toggle. Both are worse than owning thirty lines.
 *
 * So `theme` is a PROP. The design system has no opinion about where the app
 * keeps its theme — the same reason nothing in here reads a dictionary.
 *
 * `richColors` is on by default: the tone of a toast (success / info /
 * warning / error) carries meaning, and an untinted toast makes the caller's
 * choice of tone invisible. See docs/ux/mutations.md for what each tone means.
 */
export function Toaster({
	theme = "system",
	position = "bottom-center",
	richColors = true,
	...props
}: ToasterProps) {
	return (
		<Sonner
			theme={theme}
			position={position}
			richColors={richColors}
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
}
