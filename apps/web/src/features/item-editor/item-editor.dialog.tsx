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
} from "@template/design/ui/form";
import type { proto } from "@template/interfaces";
import { useMemo } from "react";
import { toast } from "sonner";

import {
	itemQueries,
	SELECTABLE_STATUSES,
	statusFromValue,
	statusKey,
	useCreateItem,
	useUpdateItem,
} from "@/entities/item";
import { toastMutationError } from "@/shared/lib/toast";

import { itemEditorContent } from "./item-editor.content";
import {
	changedPaths,
	itemEditorDefaults,
	itemEditorFormOptions,
} from "./item-editor.schema";

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

			const paths = changedPaths(initial, value);

			// Nothing to send. Firing the request anyway costs a round trip and a
			// spurious "Updated" toast for a change the user did not make.
			if (isEdit && paths.length === 0) {
				toast.info(itemEditorContent.nothingChanged);
				onOpenChange(false);
				return;
			}

			// A lookup, not `Number(value.status) as ItemStatus`. The cast was
			// only ever needed because the schema's inferred type had been
			// widened to `string`; with the union preserved, `value.status` is
			// proven to be one of the offered values and the enum member is
			// found rather than asserted.
			const status = statusFromValue(value.status);

			try {
				const saved = isEdit
					? (
							await update.mutateAsync({
								id: item?.id ?? "",
								item: {
									name: value.name,
									description: value.description,
									status,
								},
								updatePaths: paths,
							})
						).item
					: (
							await create.mutateAsync({
								name: value.name,
								description: value.description,
								status,
							})
						).item;

				// Invalidate BEFORE the toast, and await it: the success message has
				// to land on a list that already shows the change.
				await invalidate(itemQueries.lists());

				// Report the SERVER's version, not what was submitted. The server
				// normalises (it trims), so echoing the input can show a name the
				// row does not actually have.
				toast.success(
					isEdit
						? itemEditorContent.updated(saved?.name ?? value.name)
						: itemEditorContent.created(saved?.name ?? value.name),
				);
				onOpenChange(false);
			} catch (error) {
				// A server rejection that names fields goes ONTO those fields.
				// Without this the user gets "Could not create" and has to guess
				// which of three inputs to change.
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

				toastMutationError(error, {
					definite: isEdit
						? itemEditorContent.updateFailed
						: itemEditorContent.createFailed,
					indeterminate: itemEditorContent.unconfirmed,
				});
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
										value: String(status),
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
									onClick={() => onOpenChange(false)}
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
