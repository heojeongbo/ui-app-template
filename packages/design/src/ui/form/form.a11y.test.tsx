/**
 * The accessibility contract of the field layer, asserted rather than assumed.
 *
 * Every check here corresponds to a defect found in the codebase this template
 * was extracted from, where the styling looked right and the semantics were
 * absent: labels pointing at nothing, `aria-invalid` on two fields out of
 * twelve, no `aria-describedby` anywhere, and `validators.onBlur` configured
 * but never fired because no control called `handleBlur`.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { useAppForm } from "./form";

afterEach(cleanup);

const schema = z.object({
	email: z.string().min(1, "Email is required"),
});

function TestForm({ onBlurSpy }: { onBlurSpy?: () => void }) {
	const form = useAppForm({
		defaultValues: { email: "" },
		validators: {
			onSubmit: schema,
			onBlur: onBlurSpy
				? () => {
						onBlurSpy();
						return undefined;
					}
				: undefined,
		},
		onSubmit: () => {},
	});

	return (
		<form.AppForm>
			<form.Root onSubmit={() => form.handleSubmit()}>
				<form.AppField name="email">
					{(field) => <field.InputWithLabel label="Email" />}
				</form.AppField>
				<form.SubmitButton>Save</form.SubmitButton>
			</form.Root>
		</form.AppForm>
	);
}

describe("field accessibility", () => {
	it("associates the label with its control", () => {
		render(<TestForm />);
		// getByLabelText resolves through htmlFor/id — it fails outright if the
		// association is broken, which is the whole point of asserting it here.
		expect(screen.getByLabelText("Email")).toBeTruthy();
	});

	it("gives two mounted forms distinct control ids", () => {
		// Field name alone is not unique: a dialog over a page form renders the
		// same names twice, and duplicate ids point every label at the first.
		render(
			<>
				<TestForm />
				<TestForm />
			</>,
		);
		const controls = screen.getAllByLabelText("Email");
		// Asserted before the ids are compared, because `getAllByLabelText`
		// returning one element would otherwise make the inequality below pass
		// against `undefined` and report a duplicate-id bug as a pass.
		expect(controls).toHaveLength(2);
		const [first, second] = controls;
		expect(first?.id).not.toBe("");
		expect(first?.id).not.toBe(second?.id);
	});

	it("omits aria-invalid entirely while the field is valid", () => {
		render(<TestForm />);
		// Not `aria-invalid="false"`: Tailwind's `aria-invalid:` variant matches
		// [aria-invalid="true"], so a falsy attribute styles nothing while still
		// claiming a state to assistive tech.
		expect(screen.getByLabelText("Email").hasAttribute("aria-invalid")).toBe(
			false,
		);
	});

	it("marks the control invalid and points it at the message once validation fails", async () => {
		render(<TestForm />);
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("Email is required");

		const input = screen.getByLabelText("Email");
		expect(input.getAttribute("aria-invalid")).toBe("true");
		// The link between the two is what makes the message reachable; red text
		// on its own is not an announcement.
		expect(input.getAttribute("aria-describedby")).toBe(alert.id);
		expect(alert.id).not.toBe("");
	});

	it("fires the field's blur handler, so validators.onBlur actually runs", () => {
		const onBlurSpy = vi.fn();
		render(<TestForm onBlurSpy={onBlurSpy} />);

		fireEvent.blur(screen.getByLabelText("Email"));

		expect(onBlurSpy).toHaveBeenCalled();
	});
});

describe("submit button", () => {
	it("is wired to the form context without the page threading state down", () => {
		render(<TestForm />);
		const button = screen.getByRole("button", { name: "Save" });
		expect(button.getAttribute("type")).toBe("submit");
		expect((button as HTMLButtonElement).disabled).toBe(false);
	});
});
