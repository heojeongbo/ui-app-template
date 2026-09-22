import { proto } from "@template/interfaces";
import { describe, expect, it } from "vitest";

import {
	defaultSelectableStatus,
	SELECTABLE_STATUSES,
	STATUS_VALUES,
	statusFromValue,
	statusToValue,
} from "./item-status";

const Status = proto.example_v1.ItemStatus;

/**
 * The `<select>` vocabulary, and the round trip through it.
 *
 * These exist because the schema that consumes `STATUS_VALUES` used to be
 * written as `z.enum(SELECTABLE_STATUSES.map(String) as [string, ...string[]])`,
 * and that cast made `z.enum` infer plain `string` — the runtime still
 * accepted only the three values, but every consumer was handed a type that
 * said otherwise, so the dialog cast its way back with
 * `Number(value) as ItemStatus`.
 *
 * A type-level regression cannot be asserted at runtime, so what is pinned
 * here is the behaviour that goes wrong once the type stops holding: the two
 * directions must agree, and anything outside the set must resolve to
 * something inside it.
 */
describe("status <-> select value", () => {
	it("offers exactly the selectable statuses, as strings, in order", () => {
		expect(STATUS_VALUES).toEqual(["1", "2", "3"]);
		expect(STATUS_VALUES).toHaveLength(SELECTABLE_STATUSES.length);
	});

	it("round-trips every offered status", () => {
		for (const status of SELECTABLE_STATUSES) {
			expect(statusFromValue(statusToValue(status))).toBe(status);
		}
	});

	it("never produces a value the schema would reject", () => {
		// The invariant the picker depends on: the options it renders and the
		// values its schema accepts are built from one list.
		for (const status of SELECTABLE_STATUSES) {
			expect(STATUS_VALUES).toContain(statusToValue(status));
		}
	});
});

describe("defaultSelectableStatus", () => {
	it("keeps a status the user can pick", () => {
		for (const status of SELECTABLE_STATUSES) {
			expect(defaultSelectableStatus(status)).toBe(status);
		}
	});

	it("resolves UNSPECIFIED to the first offered status", () => {
		// `??` cannot do this job: it is nullish-only and UNSPECIFIED is `0`, so
		// `status ?? DRAFT` returned `0` — outside the offered set, which left
		// the select empty and the form invalid on an untouched field.
		expect(defaultSelectableStatus(Status.UNSPECIFIED)).toBe(Status.DRAFT);
	});

	it("resolves a status from a newer server", () => {
		// proto3 enums are OPEN: a value this build has never heard of decodes
		// to its raw number rather than to UNSPECIFIED.
		expect(defaultSelectableStatus(99 as proto.example_v1.ItemStatus)).toBe(
			Status.DRAFT,
		);
	});

	it("resolves an absent status", () => {
		expect(defaultSelectableStatus(undefined)).toBe(Status.DRAFT);
	});
});
