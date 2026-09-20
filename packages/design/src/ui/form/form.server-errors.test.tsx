/**
 * Server-error mapping, exercised against a real form instance rather than a
 * stub — the point of the module is that it agrees with TanStack Form's actual
 * `errorMap` / `getAllErrors` contract, which a hand-rolled mock cannot prove.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { useAppForm } from "./form";
import {
	applyServerFieldErrors,
	clearServerFieldErrors,
} from "./form.server-errors";

afterEach(cleanup);

const schema = z.object({
	username: z.string().min(1, "Username is required"),
	email: z.string().min(1, "Email is required"),
});

// `useAppForm` carries ten validator type parameters, so `ReturnType` cannot
// be taken off it directly. Wrapping the concrete call in a parameterless hook
// gives the fully-inferred instance type with no `any` and no cast.
function useTestForm() {
	return useAppForm({
		defaultValues: { username: "taken", email: "a@b.com" },
		validators: { onSubmit: schema },
		onSubmit: () => {},
	});
}

type FormInstance = ReturnType<typeof useTestForm>;

function TestForm({ onReady }: { onReady: (form: FormInstance) => void }) {
	const form = useTestForm();

	onReady(form);

	return (
		<form.AppForm>
			<form.Root onSubmit={() => form.handleSubmit()}>
				<form.AppField name="username">
					{(field) => <field.InputWithLabel label="Username" />}
				</form.AppField>
				<form.AppField name="email">
					{(field) => <field.InputWithLabel label="Email" />}
				</form.AppField>
			</form.Root>
		</form.AppForm>
	);
}

function renderForm() {
	let form!: FormInstance;
	render(
		<TestForm
			onReady={(f) => {
				form = f;
			}}
		/>,
	);
	return () => form;
}

describe("applyServerFieldErrors", () => {
	it("renders a server message on the field it names", async () => {
		const getForm = renderForm();

		act(() => {
			applyServerFieldErrors(getForm(), [
				{ field: "username", message: "That username is taken" },
			]);
		});

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("That username is taken");
		// The whole point: the user is told WHICH field to change.
		expect(
			screen.getByLabelText("Username").getAttribute("aria-describedby"),
		).toBe(alert.id);
	});

	it("reports paths that match no field instead of dropping them", () => {
		const getForm = renderForm();

		let result!: ReturnType<typeof applyServerFieldErrors>;
		act(() => {
			result = applyServerFieldErrors(getForm(), [
				{ field: "username", message: "taken" },
				{ field: "nope", message: "orphaned" },
			]);
		});

		expect(result.applied).toEqual(["username"]);
		// A silently dropped error makes a failed save look successful; the
		// caller has to surface these some other way.
		expect(result.unmatched).toEqual([{ field: "nope", message: "orphaned" }]);
	});

	it("marks the field touched so the message is not hidden", () => {
		const getForm = renderForm();

		act(() => {
			applyServerFieldErrors(getForm(), [
				{ field: "email", message: "Already registered" },
			]);
		});

		expect(getForm().getFieldMeta("email")?.isTouched).toBe(true);
	});
});

describe("clearServerFieldErrors", () => {
	it("removes server errors so a second submit can proceed", async () => {
		const getForm = renderForm();

		act(() => {
			applyServerFieldErrors(getForm(), [
				{ field: "username", message: "That username is taken" },
			]);
		});
		expect(await screen.findByRole("alert")).toBeTruthy();

		act(() => {
			clearServerFieldErrors(getForm());
		});

		// Left in place, a stale server error keeps `canSubmit` false and the
		// retry never fires — the form just appears frozen.
		expect(screen.queryByRole("alert")).toBeNull();
		expect(
			getForm().getFieldMeta("username")?.errorMap.onServer,
		).toBeUndefined();
	});

	it("leaves client-side validation errors alone", async () => {
		const getForm = renderForm();

		act(() => {
			getForm().setFieldValue("username", "");
		});
		act(() => {
			void getForm().handleSubmit();
		});
		expect(await screen.findByRole("alert")).toBeTruthy();

		act(() => {
			clearServerFieldErrors(getForm());
		});

		// Only the `onServer` slot is cleared; onChange/onSubmit verdicts stand.
		expect(await screen.findByRole("alert")).toBeTruthy();
	});
});
