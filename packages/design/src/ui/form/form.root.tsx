import { type ComponentProps, useCallback } from "react";

type FormRootProps = ComponentProps<"form">;

// Derived rather than named: React 19 hands `onSubmit` a `SubmitEvent`, not the
// `FormEvent` older versions used. Reading the type off the prop keeps this
// correct through that kind of change instead of pinning a name that moved.
type FormSubmitHandler = NonNullable<FormRootProps["onSubmit"]>;

/**
 * The `<form>` element.
 *
 * Swallows the native submit (preventDefault + stopPropagation) before handing
 * off, so a form nested inside another — a dialog opened over a page form —
 * cannot submit its parent. `stopPropagation` is the half people leave out,
 * and the resulting bug looks like "the wrong thing saved".
 */
export function FormRoot({
	className,
	children,
	onSubmit,
	...props
}: FormRootProps) {
	const handleSubmit = useCallback<FormSubmitHandler>(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			onSubmit?.(e);
		},
		[onSubmit],
	);

	return (
		<form className={className} onSubmit={handleSubmit} {...props}>
			{children}
		</form>
	);
}
