import { extractFieldErrors } from "@template/core/api";
import { useInvalidateQuery } from "@template/core/query";
import { Button } from "@template/design/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@template/design/ui/dialog";
import {
	applyServerFieldErrors,
	clearServerFieldErrors,
	useAppForm,
	useStore,
} from "@template/design/ui/form";
import type { proto } from "@template/interfaces";
import { useMemo } from "react";
import { toast } from "sonner";

import {
	itemQueries,
	SELECTABLE_STATUSES,
	statusKey,
	statusToValue,
	useCreateItem,
	useUpdateItem,
} from "@/entities/item";
import { confirm } from "@/shared/lib/confirm";
import { useUnsavedChangesGuard } from "@/shared/lib/form";
import { toastMutationError } from "@/shared/lib/toast";

import { itemEditorContent } from "./item-editor.content";
import {
	itemEditorDefaults,
	itemEditorFormOptions,
} from "./item-editor.schema";
import { failureCopy, planSubmit, successMessage } from "./item-editor.submit";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Absent = create. Present = edit. */
	item?: proto.example_v1.Item;
};

/**
 * Create and edit, in one dialog — and the reference implementation of this
 * codebase's mutation contract.
 *
 * The full sequence, in order, and none of it is optional:
 *
 *   clear stale server errors → validate → mutate → invalidate → toast → close
 *
 * Each step exists because skipping it produces a specific bug:
 *
 * - **Clear first.** A leftover `onServer` error keeps `canSubmit` false, so
 *   the retry never fires and the form just looks frozen.
 * - **Invalidate before the toast.** "Created" appearing over a list that has
 *   not refreshed makes the user think it failed.
 * - **Close only on success.** On failure the dialog stays open with the
 *   user's input intact, so they can fix one field and retry rather than
 *   retyping everything.
 * - **Report BOTH outcomes.** A silent failure is indistinguishable from a
 *   silent success.
 *
 * See docs/ux/mutations.md.
 */
export function ItemEditorDialog({ open, onOpenChange, item }: Props) {
	const isEdit = Boolean(item);
	const create = useCreateItem();
	const update = useUpdateItem();
	const invalidate = useInvalidateQuery();

	const initial = useMemo(() => itemEditorDefaults(item), [item]);
	const options = useMemo(
		() => itemEditorFormOptions(itemEditorContent, item),
		[item],
	);

	const form = useAppForm({
		...options,
		onSubmit: async ({ value }) => {
			clearServerFieldErrors(form);

			// Every rule about WHAT to send lives in `item-editor.submit.ts`, so a
			// scenario test can assert it without rendering. What is left here is
			// the part that genuinely needs React and the network.
			const plan = planSubmit(value, initial, item);

			if (plan.kind === "noop") {
				toast.info(itemEditorContent.nothingChanged);
				onOpenChange(false);
				return;
			}

			try {
				const saved =
					plan.kind === "update"
						? (await update.mutateAsync(plan.request)).item
						: (await create.mutateAsync(plan.request)).item;

				// Invalidate BEFORE the toast, and await it: the success message has
				// to land on a list that already shows the change.
				await invalidate(itemQueries.lists());

				toast.success(
					successMessage(itemEditorContent, plan.kind, saved, value.name),
				);
				onOpenChange(false);
			} catch (error) {
				// A server rejection that names fields goes ONTO those fields.
				// Without this the user gets "Could not create" and has to guess
				// which of three inputs to change.
				//
				// Stays here rather than moving with the rest: routing an error onto
				// a field needs the live form instance, which is exactly the kind of
				// thing a `.ts` decision module must not hold.
				const fieldErrors = extractFieldErrors(error);
				if (fieldErrors.length > 0) {
					const { unmatched } = applyServerFieldErrors(form, fieldErrors);
					// Anything that matched no field still has to be surfaced, or a
					// failed save looks like a successful one.
					if (unmatched.length > 0) {
						toast.error(unmatched.map((e) => e.message).join(" "));
					}
					return;
				}

				toastMutationError(error, failureCopy(itemEditorContent, plan.kind));
			}
		},
	});

	const isDirty = useStore(form.store, (state) => state.isDirty);

	// In-app navigation and tab close. The dialog's OWN close paths are guarded
	// separately below — a blocker only sees navigation, and clicking Cancel is
	// not navigation.
	useUnsavedChangesGuard({
		when: isDirty,
		copy: itemEditorContent.discard,
	});

	/**
	 * Closing the dialog itself: Cancel, Escape, the overlay, the X.
	 *
	 * All four funnel through `Dialog`'s `onOpenChange`, which is why the guard
	 * lives here rather than on the Cancel button — guarding only the button
	 * leaves the three exits a user is more likely to take wide open.
	 *
	 * Submitting also closes, and must not prompt: `onSubmit` calls
	 * `onOpenChange` directly rather than going through this.
	 */
	const requestClose = async (next: boolean) => {
		if (next) return;
		if (isDirty && !(await confirm(itemEditorContent.discard))) return;
		onOpenChange(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				void requestClose(next);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEdit
							? itemEditorContent.editTitle
							: itemEditorContent.createTitle}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? itemEditorContent.editDescription
							: itemEditorContent.createDescription}
					</DialogDescription>
				</DialogHeader>

				<form.AppForm>
					<form.Root
						id="item-editor"
						className="flex flex-col gap-4"
						onSubmit={() => form.handleSubmit()}
					>
						<form.AppField name="name">
							{(field) => (
								<field.InputWithLabel
									label={itemEditorContent.nameLabel}
									autoFocus
								/>
							)}
						</form.AppField>

						<form.AppField name="description">
							{(field) => (
								<field.TextareaWithLabel
									label={itemEditorContent.descriptionLabel}
									rows={4}
								/>
							)}
						</form.AppField>

						<form.AppField name="status">
							{(field) => (
								<field.SelectWithLabel
									label={itemEditorContent.statusLabel}
									items={SELECTABLE_STATUSES.map((status) => ({
										// `statusToValue`, not `String(status)` — the one
										// place that still reasserted the DOM's string
										// spelling by hand instead of using the helper that
										// owns it.
										value: statusToValue(status),
										label: itemEditorContent.statusOptions[statusKey(status)],
									}))}
								/>
							)}
						</form.AppField>
					</form.Root>

					<DialogFooter>
						{/*
							Cancel is disabled while the request is open. Closing
							mid-flight leaves a write in progress with nobody left to
							report its outcome.
						*/}
						<form.Subscribe selector={(state) => state.isSubmitting}>
							{(isSubmitting) => (
								<Button
									variant="ghost"
									disabled={isSubmitting}
									onClick={() => {
										void requestClose(false);
									}}
								>
									{itemEditorContent.cancel}
								</Button>
							)}
						</form.Subscribe>

						{/*
							`form` attribute rather than nesting the button inside the
							<form>: the dialog's footer is outside it, and without this
							the button submits nothing.
						*/}
						<form.SubmitButton form="item-editor">
							{isEdit ? itemEditorContent.save : itemEditorContent.create}
						</form.SubmitButton>
					</DialogFooter>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
