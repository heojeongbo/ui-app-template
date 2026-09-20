import { cn } from "@template/design/lib/utils";
import { Label } from "@template/design/ui/label";
import type { LabelHTMLAttributes, ReactNode } from "react";

import { FormFieldError } from "./form.field-error";

export type FieldOrientation = "vertical" | "horizontal";

/** Props every `*WithLabel` field accepts, so the shape stays uniform. */
export type FormFieldLabelProps = {
	label: string;
	labelProps?: LabelHTMLAttributes<HTMLLabelElement>;
	orientation?: FieldOrientation;
	showErrorMessage?: boolean;
};

type FormFieldLayoutProps = FormFieldLabelProps & {
	/** The control's `id`. Comes from `useFormField`, never hand-written. */
	htmlFor: string;
	/** The error node's `id`, matching the control's `aria-describedby`. */
	errorId: string;
	children: ReactNode;
	className?: string;
};

/**
 * Label + control + error, shared by every labelled field.
 *
 * Extracted rather than repeated per control: five fields need identical
 * orientation and error handling, and the first divergence between copies is
 * how a form stops looking like one form.
 *
 * `htmlFor` is required and comes from `useFormField` — the label/control pair
 * is the accessibility contract, and a field that derives its own id is a field
 * whose label points at nothing the moment two forms are on screen.
 */
export function FormFieldLayout({
	label,
	labelProps,
	orientation = "vertical",
	showErrorMessage = true,
	htmlFor,
	errorId,
	children,
	className,
}: FormFieldLayoutProps) {
	return (
		<div className="flex flex-col gap-2">
			<div
				className={cn(
					"w-full gap-2",
					orientation === "horizontal"
						? "flex items-center"
						: "flex flex-col items-start",
					className,
				)}
			>
				<Label htmlFor={htmlFor} {...labelProps}>
					{label}
				</Label>
				{orientation === "horizontal" ? (
					<div className="min-w-0 flex-1">{children}</div>
				) : (
					children
				)}
			</div>
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}
