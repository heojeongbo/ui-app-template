import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createAppStore } from "./create-store.ts";

/**
 * Rehydration is the store layer's untrusted boundary.
 *
 * These tests exist because the failure they cover was reproduced in a real
 * browser first, not imagined: with no schema, writing
 * `{"state":{"session":"not-an-object"},"version":1}` into localStorage put the
 * app past its `(auth)` guard and onto a protected page, because the guard
 * tests `!session` and a non-empty string is truthy.
 *
 * Every assertion below names the shape that produced a real defect.
 */

type State = { user: { id: string; name: string } | null; touch: () => void };

const schema = z.object({
	user: z.object({ id: z.string().min(1), name: z.string().min(1) }).nullable(),
});

function build(key: string) {
	return createAppStore<State>(
		(set) => ({ user: null, touch: () => set({}) }),
		{
			name: key,
			persistKey: key,
			partialize: (s) => ({ user: s.user }),
			persistSchema: schema,
		},
	);
}

/** What zustand's persist middleware actually writes. */
function seed(key: string, state: unknown, version = 0) {
	localStorage.setItem(key, JSON.stringify({ state, version }));
}

describe("createAppStore persistence", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("rehydrates a value that matches the schema", () => {
		seed("ok", { user: { id: "u1", name: "Ada" } });
		expect(build("ok").getState().user).toEqual({ id: "u1", name: "Ada" });
	});

	it("round-trips an intentional null — signed-out has to survive a reload", () => {
		// `.nullable()` not `.optional()`: this is a value the store writes on
		// purpose, so rejecting it would sign a user out every time they reload
		// a page they had deliberately signed out of.
		seed("null-ok", { user: null });
		expect(build("null-ok").getState().user).toBeNull();
	});

	it("falls back to defaults when the persisted value is the wrong type", () => {
		// The reproduced browser case. Truthy, so every `if (!user)` guard
		// downstream passes it through.
		seed("wrong-type", { user: "not-an-object" });
		expect(build("wrong-type").getState().user).toBeNull();
	});

	it("falls back when a field the current build requires is missing", () => {
		// Schema drift, and the case that hits real users with no malice: ship a
		// build that adds `name`, and every session stored by the previous one
		// is a value whose type is a lie.
		seed("drift", { user: { id: "u1" } });
		expect(build("drift").getState().user).toBeNull();
	});

	it("rejects an empty string where the schema demands content", () => {
		// `z.string()` alone accepts `""`, which renders as a blank name with no
		// hint of why — the reason both fields carry `.min(1)`.
		seed("empty", { user: { id: "u1", name: "" } });
		expect(build("empty").getState().user).toBeNull();
	});

	it("keeps the app running when storage holds outright garbage", () => {
		localStorage.setItem("garbage", "}{not json");
		expect(() => build("garbage")).not.toThrow();
		expect(build("garbage").getState().user).toBeNull();
	});

	it("refuses to build a persisted store with no schema", () => {
		// Required rather than defaulted to "no validation": in development
		// localStorage only ever holds what the current build just wrote, so an
		// unvalidated store looks correct right up until it ships.
		expect(() =>
			createAppStore<State>((set) => ({ user: null, touch: () => set({}) }), {
				name: "unguarded",
				persistKey: "unguarded",
				partialize: (s) => ({ user: s.user }),
			}),
		).toThrow(/persistSchema/);
	});

	it("still refuses a persisted store with no partialize", () => {
		expect(() =>
			createAppStore<State>((set) => ({ user: null, touch: () => set({}) }), {
				name: "whole",
				persistKey: "whole",
				persistSchema: schema,
			}),
		).toThrow(/partialize/);
	});

	it("treats a store that declares no version as version 0", () => {
		// Pins a real defect. The factory used to pass `version` and `migrate`
		// through unconditionally, and zustand builds its options as
		// `{ version: 0, ...yours }` — so `version: undefined` overrode the
		// default. A store with no version then compared every stored blob
		// against `undefined`, took the migrate path it has no function for,
		// and discarded a perfectly valid value.
		seed("v0", { user: { id: "u1", name: "Ada" } }, 0);
		expect(build("v0").getState().user).toEqual({ id: "u1", name: "Ada" });
	});

	it("discards state written under an older version when nothing can migrate it", () => {
		// The blunt fallback, asserted so its bluntness is a decision rather
		// than a surprise: no `migrate` means a version bump signs the user out.
		// That is why `persistSchema` exists alongside it — `version` only
		// fires when the integer differs, and that integer sits in the same
		// untrusted blob as the data.
		seed("stale", { user: { id: "u1", name: "Ada" } }, 0);
		const store = createAppStore<State>(
			(set) => ({ user: null, touch: () => set({}) }),
			{
				name: "stale",
				persistKey: "stale",
				partialize: (s) => ({ user: s.user }),
				persistSchema: schema,
				version: 2,
			},
		);
		expect(store.getState().user).toBeNull();
	});

	it("does not validate a store that never persists", () => {
		// No storage boundary, nothing to distrust — demanding a schema here
		// would be ceremony, and the factory is what decides that, not the call
		// site.
		const store = createAppStore<State>(
			(set) => ({ user: null, touch: () => set({}) }),
			{ name: "ephemeral" },
		);
		expect(store.getState().user).toBeNull();
	});
});
