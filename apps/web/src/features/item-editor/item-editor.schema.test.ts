import { create } from "@bufbuild/protobuf";
import { proto } from "@template/interfaces";
import { describe, expect, it } from "vitest";

import { SELECTABLE_STATUSES } from "@/entities/item";

import { itemEditorDefaults, itemEditorSchema } from "./item-editor.schema";

const copy = {
	nameRequired: "required",
	nameTooLong: "too long",
	descriptionTooLong: "too long",
};

const item = (status: proto.example_v1.ItemStatus) =>
	create(proto.example_v1.ItemSchema, {
		id: "i1",
		name: "Widget",
		description: "",
		status,
	});

/**
 * The invariant these pin: **a form default must be a member of the set the
 * control offers.** A default outside that set renders an empty select and
 * fails validation on a field the user never touched, which reads as the app
 * being broken rather than as their mistake.
 */
describe("itemEditorDefaults", () => {
	it("keeps a status the user can actually pick", () => {
		for (const status of SELECTABLE_STATUSES) {
			expect(itemEditorDefaults(item(status)).status).toBe(String(status));
		}
	});

	it("defaults to DRAFT for a brand-new item", () => {
		expect(itemEditorDefaults().status).toBe(
			String(proto.example_v1.ItemStatus.DRAFT),
		);
	});

	it("resolves UNSPECIFIED to DRAFT rather than passing 0 through", () => {
		// The defect. `item?.status ?? DRAFT` cannot fire for this value: `??` is
		// nullish-only and UNSPECIFIED is `0`, so the defaults carried
		// `status: "0"` — not a member of `["1","2","3"]`.
		//
		// Not a contrived input: a proto3 scalar is absent on the wire when it
		// holds the zero value, so any server that never set a status sends one
		// that decodes to exactly this.
		expect(
			itemEditorDefaults(item(proto.example_v1.ItemStatus.UNSPECIFIED)).status,
		).toBe(String(proto.example_v1.ItemStatus.DRAFT));
	});

	it("resolves a status from a newer server to DRAFT", () => {
		// proto3 enums are OPEN. A server that adds a fifth status sends a number
		// this build has never heard of, and it decodes to that raw number rather
		// than to UNSPECIFIED.
		expect(
			itemEditorDefaults(item(99 as proto.example_v1.ItemStatus)).status,
		).toBe(String(proto.example_v1.ItemStatus.DRAFT));
	});

	it("produces defaults its own schema accepts, for every status", () => {
		// The invariant stated directly, rather than as four separate examples:
		// whatever the server sends, the starting values must already be valid.
		const schema = itemEditorSchema(copy);
		for (const status of [
			proto.example_v1.ItemStatus.UNSPECIFIED,
			...SELECTABLE_STATUSES,
			99 as proto.example_v1.ItemStatus,
		]) {
			expect(schema.safeParse(itemEditorDefaults(item(status))).success).toBe(
				true,
			);
		}
	});
});
