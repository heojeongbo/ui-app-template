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
import { useIntlayer } from "react-intlayer";
import { toast } from "sonner";

import {
	itemQueries,
	SELECTABLE_STATUSES,
	type StatusDisplayKey,
	statusKey,
	statusToValue,
	useCreateItem,
	useUpdateItem,
} from "@/entities/item";
import { confirm } from "@/shared/lib/confirm";
import { useUnsavedChangesGuard } from "@/shared/lib/form";
import { toastMutationError } from "@/shared/lib/toast";

import { ITEM_LIMITS } from "./item-editor.limits";
import {
	itemEditorDefaults,
	itemEditorFormOptions,
} from "./item-editor.schema";
import {
	failureCopy,
	planSubmit,
	type SubmitCopy,
	successMessage,
} from "./item-editor.submit";

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
	const c = useIntlayer("item-editor");
	const common = useIntlayer("common");

	// Re-stated where the compiler sees the GENERATED type: the option list
	// below is built from SELECTABLE_STATUSES, so a status added there without
	// a label fails here instead of rendering a blank row in the dropdown.
	const statusOptions = c.statusOptions satisfies Record<
		StatusDisplayKey,
		unknown
	>;

	const isEdit = Boolean(item);
	const create = useCreateItem();
	const update = useUpdateItem();
	const invalidate = useInvalidateQuery();

	const initial = useMemo(() => itemEditorDefaults(item), [item]);

	// Keyed on the MESSAGES, not on `c`: `useIntlayer` may return a fresh object
	// each render, and a changed `defaultValues` identity is how a form resets
	// under someone who is typing in it. `[item]` alone was the old shape, and
	// it froze the boot locale into the validation messages the moment copy
	// stopped being a module constant. See docs/ux/forms.md.
	const nameTooLong = c.nameTooLong({ max: String(ITEM_LIMITS.name) });
	const descriptionTooLong = c.descriptionTooLong({
		max: String(ITEM_LIMITS.description),
	});
	const options = useMemo(
		() =>
			itemEditorFormOptions(
				{
					// Field by field, never a spread: a dictionary leaf is a node, not
					// a string, so `{...c}` satisfies none of these and the message
					// renders as "[object Object]" on a form error.
					nameRequired: c.nameRequired.value,
					nameTooLong,
					descriptionTooLong,
				},
				item,
			),
		[item, c.nameRequired.value, nameTooLong, descriptionTooLong],
	);

	/**
	 * The adapter, and the line intlayer's types stop at.
	 *
	 * `item-editor.submit.ts` is a pure `.ts` a scenario test asserts, and its
	 * contract describes what a SUBMIT needs — not how this quarter's i18n
	 * library spells interpolation. Keeping `(name: string) => string` on that
	 * side is what lets the test hand it five plain strings and never import a
	 * dictionary.
	 */
	const submitCopy: SubmitCopy = useMemo(
		() => ({
			created: (name: string) => c.created({ name }),
			updated: (name: string) => c.updated({ name }),
			createFailed: c.createFailed.value,
			updateFailed: c.updateFailed.value,
			unconfirmed: c.unconfirmed.value,
		}),
		[c],
	);

	const discardCopy = {
		title: c.discard.title.value,
		body: c.discard.body.value,
		confirmLabel: c.discard.confirmLabel.value,
		cancelLabel: c.discard.cancelLabel.value,
	};

	const form = useAppForm({
		...options,
		onSubmit: async ({ value }) => {
			clearServerFieldErrors(form);

			// Every rule about WHAT to send lives in `item-editor.submit.ts`, so a
			// scenario test can assert it without rendering. What is left here is
			// the part that genuinely needs React and the network.
			const plan = planSubmit(value, initial, item);

			if (plan.kind === "noop") {
				toast.info(c.nothingChanged.value);
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

				toast.success(successMessage(submitCopy, plan.kind, saved, value.name));
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

				toastMutationError(error, failureCopy(submitCopy, plan.kind));
			}
		},
	});

	const isDirty = useStore(form.store, (state) => state.isDirty);

	// In-app navigation and tab close. The dialog's OWN close paths are guarded
	// separately below — a blocker only sees navigation, and clicking Cancel is
	// not navigation.
	useUnsavedChangesGuard({
		when: isDirty,
		copy: discardCopy,
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
		if (isDirty && !(await confirm(discardCopy))) return;
		onOpenChange(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				void requestClose(next);
			}}
		>
			{/*
				The close button's accessible name is passed, not defaulted: the
				design package ships no words, so a dialog with no `closeLabel`
				renders no close button rather than an English one.
			*/}
			<DialogContent closeLabel={common.close.value}>
				<DialogHeader>
					<DialogTitle>{isEdit ? c.editTitle : c.createTitle}</DialogTitle>
					<DialogDescription>
						{isEdit ? c.editDescription : c.createDescription}
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
								<field.InputWithLabel label={c.nameLabel.value} autoFocus />
							)}
						</form.AppField>

						<form.AppField name="description">
							{(field) => (
								<field.TextareaWithLabel
									label={c.descriptionLabel.value}
									rows={4}
								/>
							)}
						</form.AppField>

						<form.AppField name="status">
							{(field) => (
								<field.SelectWithLabel
									label={c.statusLabel.value}
									items={SELECTABLE_STATUSES.map((status) => ({
										// `statusToValue`, not `String(status)` — the one
										// place that still reasserted the DOM's string
										// spelling by hand instead of using the helper that
										// owns it.
										value: statusToValue(status),
										label: statusOptions[statusKey(status)].value,
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
									{common.cancel}
								</Button>
							)}
						</form.Subscribe>

						{/*
							`form` attribute rather than nesting the button inside the
							<form>: the dialog's footer is outside it, and without this
							the button submits nothing.
						*/}
						<form.SubmitButton form="item-editor">
							{isEdit ? common.save : common.create}
						</form.SubmitButton>
					</DialogFooter>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
