import { cn } from "@template/design/lib/utils";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

import {
	DialogContent as PrimitiveDialogContent,
	DialogFooter as PrimitiveDialogFooter,
} from "../primitive/dialog";

/**
 * The two dialog parts that upstream ships with words in them.
 *
 * `primitive/dialog.tsx` renders `<span className="sr-only">Close</span>` on
 * its close button and `<Button>Close</Button>` in its footer. Both are words
 * this package cannot translate and the consuming app cannot override — and
 * the first one SHIPS: `showCloseButton` defaults to true, so every dialog in
 * every app built on this template carries an English accessible name on its
 * close button, whatever language the rest of the screen is in.
 *
 * `primitive/` is CLI-owned and never hand-edited (a hand-edit is reverted by
 * the next `pnpm ui:add dialog --overwrite`), so the fix lives here, in the
 * wrapper layer that `add-ui.mts` deliberately leaves alone.
 *
 * The boolean is replaced by the label rather than joined to it: a
 * `showCloseButton` next to a separate `closeLabel` lets a caller ask for a
 * button with no accessible name, which is the bug being fixed. Pass the word
 * and get the button; omit it and get none.
 */
type CloseCopy = {
	/**
	 * The close button's accessible name. Omit to render no close button.
	 *
	 * A plain `string`, not a `ReactNode`: it lands in `sr-only` text and, for
	 * a dictionary leaf, that means the call site passes `.value`. See the
	 * shape table in docs/ux/copy.md.
	 */
	closeLabel?: string;
};

export function DialogContent({
	closeLabel,
	children,
	...props
}: Omit<
	React.ComponentProps<typeof PrimitiveDialogContent>,
	"showCloseButton"
> &
	CloseCopy) {
	return (
		<PrimitiveDialogContent showCloseButton={false} {...props}>
			{children}
			{closeLabel === undefined ? null : (
				<DialogPrimitive.Close
					data-slot="dialog-close"
					className={CLOSE_BUTTON}
				>
					<XIcon />
					<span className="sr-only">{closeLabel}</span>
				</DialogPrimitive.Close>
			)}
		</PrimitiveDialogContent>
	);
}

export function DialogFooter({
	closeLabel,
	children,
	...props
}: Omit<React.ComponentProps<typeof PrimitiveDialogFooter>, "showCloseButton"> &
	CloseCopy) {
	return (
		<PrimitiveDialogFooter showCloseButton={false} {...props}>
			{children}
			{closeLabel === undefined ? null : (
				<DialogPrimitive.Close asChild>
					<button type="button" className={FOOTER_CLOSE_BUTTON}>
						{closeLabel}
					</button>
				</DialogPrimitive.Close>
			)}
		</PrimitiveDialogFooter>
	);
}

/**
 * Ours, not a copy of upstream's class string — and that is deliberate. A
 * copied string is a keep-in-sync burden that decays silently after the next
 * `pnpm ui:add dialog`, while an owned style is a design-system decision the
 * two-layer split already says this package is allowed to make.
 */
const CLOSE_BUTTON = cn(
	"absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity",
	"hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
	"disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
	"[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
);

const FOOTER_CLOSE_BUTTON = cn(
	"inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2",
	"whitespace-nowrap font-medium text-sm shadow-xs transition-all",
	"hover:bg-accent hover:text-accent-foreground",
	"focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
	"disabled:pointer-events-none disabled:opacity-50",
);
