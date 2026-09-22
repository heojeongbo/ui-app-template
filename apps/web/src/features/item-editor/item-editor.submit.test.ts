import { create } from "@bufbuild/protobuf";
import { proto } from "@template/interfaces";
import { describe, expect, it } from "vitest";

import { statusToValue } from "@/entities/item";

import { itemEditorDefaults } from "./item-editor.schema";
import {
	failureCopy,
	planSubmit,
	type SubmitCopy,
	successMessage,
} from "./item-editor.submit";

const Status = proto.example_v1.ItemStatus;

const copy: SubmitCopy = {
	created: (name) => `created:${name}`,
	updated: (name) => `updated:${name}`,
	createFailed: "create-failed",
	updateFailed: "update-failed",
	unconfirmed: "unconfirmed",
};

const item = (over: Partial<proto.example_v1.Item> = {}) =>
	create(proto.example_v1.ItemSchema, {
		id: "i1",
		name: "Widget",
		description: "A thing",
		status: Status.DRAFT,
		...over,
	});

/**
 * These tests are the reason the extraction happened.
 *
 * All of this used to live inside the dialog's `onSubmit`, which a scenario
 * test cannot reach: **a scenario test never renders**. The no-op guard, the
 * field mask and the choice of success message were rules nothing asserted.
 */
describe("planSubmit", () => {
	const values = {
		name: "Widget",
		description: "A thing",
		status: statusToValue(Status.DRAFT),
	};

	it("creates when there is no item to edit", () => {
		const plan = planSubmit(values, values, undefined);
		expect(plan).toEqual({
			kind: "create",
			request: {
				name: "Widget",
				description: "A thing",
				status: Status.DRAFT,
			},
		});
	});

	it("refuses to send an edit that changes nothing", () => {
		// Sending it anyway costs a round trip and produces an "Updated" toast
		// for a change the user did not make, which teaches them the message
		// means nothing.
		const existing = item();
		const initial = itemEditorDefaults(existing);
		expect(planSubmit(initial, initial, existing)).toEqual({ kind: "noop" });
	});

	it("sends only the fields that actually changed", () => {
		// The field mask is the whole reason an update carries `updatePaths`.
		// Omitting it tells the server "this is the whole object", so a form that
		// only touched `name` would blank `description` for everyone else.
		const existing = item();
		const initial = itemEditorDefaults(existing);
		const plan = planSubmit({ ...initial, name: "Renamed" }, initial, existing);

		expect(plan).toMatchObject({
			kind: "update",
			request: { id: "i1", updatePaths: ["name"] },
		});
	});

	it("lists every changed field, not just the first", () => {
		const existing = item();
		const initial = itemEditorDefaults(existing);
		const plan = planSubmit(
			{ ...initial, name: "Renamed", description: "Different" },
			initial,
			existing,
		);

		expect(plan).toMatchObject({
			kind: "update",
			request: { updatePaths: ["name", "description"] },
		});
	});

	it("converts the select's string back to the enum", () => {
		// The form's `status` is a `<select>` value and therefore a string. The
		// request needs the enum member, found by lookup rather than asserted
		// with `Number(value) as ItemStatus`.
		const existing = item();
		const initial = itemEditorDefaults(existing);
		const plan = planSubmit(
			{ ...initial, status: statusToValue(Status.ACTIVE) },
			initial,
			existing,
		);

		expect(plan).toMatchObject({
			kind: "update",
			request: {
				item: { status: Status.ACTIVE },
				updatePaths: ["status"],
			},
		});
	});

	it("treats a status the server sent but the form cannot offer as a change", () => {
		// An item stored as UNSPECIFIED opens with DRAFT selected, because a form
		// default must be a member of the set the control offers. Saving it is
		// therefore a real edit — the row genuinely moves from unset to draft.
		const existing = item({ status: Status.UNSPECIFIED });
		const initial = itemEditorDefaults(existing);
		expect(initial.status).toBe(statusToValue(Status.DRAFT));
		expect(planSubmit(initial, initial, existing)).toEqual({ kind: "noop" });
	});
});

describe("successMessage", () => {
	it("reports the name the SERVER stored, not the one submitted", () => {
		// The server normalises — this one trims — so echoing the input can
		// announce a name the row does not actually have.
		expect(
			successMessage(copy, "create", item({ name: "Trimmed" }), "  Trimmed  "),
		).toBe("created:Trimmed");
	});

	it("falls back to the submitted name when the server returns nothing", () => {
		expect(successMessage(copy, "update", undefined, "Widget")).toBe(
			"updated:Widget",
		);
	});

	it("uses the verb that matches what was attempted", () => {
		expect(successMessage(copy, "create", undefined, "x")).toBe("created:x");
		expect(successMessage(copy, "update", undefined, "x")).toBe("updated:x");
	});
});

describe("failureCopy", () => {
	it("never reports the wrong verb", () => {
		// A create that fails must not say "Could not update".
		expect(failureCopy(copy, "create").definite).toBe("create-failed");
		expect(failureCopy(copy, "update").definite).toBe("update-failed");
	});

	it("uses one indeterminate message for both", () => {
		// "We could not confirm" is true regardless of which verb was attempted,
		// and claiming failure for a lost answer is a claim we cannot support.
		expect(failureCopy(copy, "create").indeterminate).toBe(
			failureCopy(copy, "update").indeterminate,
		);
	});
});
