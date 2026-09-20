import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@template/design/ui/alert-dialog";
import { Checkbox } from "@template/design/ui/checkbox";
import { Label } from "@template/design/ui/label";
import { useEffect, useId, useState } from "react";

import { useConfirmStore } from "@/shared/lib/confirm";

/**
 * The single confirmation dialog, mounted once at the root.
 *
 * `AlertDialog` and not `Dialog`: an alert dialog takes focus, traps it, and
 * is announced as requiring a response. A plain dialog is dismissible in ways
 * a destructive confirmation should not be.
 */
export function ConfirmDialog() {
	const open = useConfirmStore((s) => s.open);
	const options = useConfirmStore((s) => s.options);
	const settle = useConfirmStore((s) => s.settle);
	const acknowledgeId = useId();
	const [acknowledged, setAcknowledged] = useState(false);

	// Reset the checkbox per request. Leaving it ticked would mean the second
	// dangerous action of a session is unguarded — exactly the one the guard
	// exists for.
	useEffect(() => {
		if (open) setAcknowledged(false);
	}, [open]);

	if (!options) return null;

	const blocked = Boolean(options.acknowledge) && !acknowledged;

	return (
		<AlertDialog
			open={open}
			// Escape and outside-click resolve as "no". Leaving the promise
			// unsettled would hang whatever awaited it, with no visible cause.
			onOpenChange={(next) => {
				if (!next) settle(false);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{options.title}</AlertDialogTitle>
					<AlertDialogDescription>{options.body}</AlertDialogDescription>
				</AlertDialogHeader>

				{options.acknowledge ? (
					<div className="flex items-start gap-2">
						<Checkbox
							id={acknowledgeId}
							checked={acknowledged}
							onCheckedChange={(checked) => setAcknowledged(checked === true)}
						/>
						<Label htmlFor={acknowledgeId} className="text-sm leading-snug">
							{options.acknowledge}
						</Label>
					</div>
				) : null}

				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => settle(false)}>
						{options.cancelLabel}
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={blocked}
						// Destructive actions look destructive. A "Delete" button in
						// the default variant reads as the safe choice.
						className={
							options.destructive
								? "bg-danger text-danger-foreground hover:bg-danger/90"
								: undefined
						}
						onClick={() => settle(true)}
					>
						{options.confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
