import { create, type StateCreator } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { createScopedLogger } from "../logger/logger.ts";

const log = createScopedLogger("Store");

/**
 * The shape this factory needs from a schema, written structurally rather than
 * as `z.ZodType`.
 *
 * Two reasons. It keeps `packages/core` from pinning a zod major into its
 * public signature — a consumer on a different zod can still pass its schemas.
 * And it demands a SYNCHRONOUS result, which zustand's `merge` requires: an
 * async refinement would rehydrate to a promise the store would store as state.
 *
 * Any zod schema satisfies this as-is.
 */
export type SyncSchema<T> = {
	safeParse: (
		data: unknown,
	) => { success: true; data: T } | { success: false; error: unknown };
};

/**
 * The store factory, and the rule that goes with it.
 *
 * **State has three homes in this app, not two:**
 *
 * | What | Where |
 * | --- | --- |
 * | Server data | TanStack Query. Never mirrored anywhere else. |
 * | Cross-cutting client state (auth, theme, layout) | here |
 * | A continuously-tracked external value (a socket, a media element) | a module-scope source read through `useSyncExternalStore` |
 *
 * The rule that matters: **server data never lives in a store.** Copying a
 * query result into Zustand gives you two sources of truth with no
 * invalidation story, and the copy is stale from the moment a mutation runs.
 * A `refetchInterval` used to keep a store in sync is the same smell.
 *
 * Most state is none of the three and should stay in `useState` until a second
 * consumer actually appears.
 */

export type CreateAppStoreOptions<T> = {
	/** Shows up in the Redux DevTools timeline. Keep it stable. */
	name: string;

	/**
	 * Persist to localStorage under this key.
	 *
	 * Omit it unless the value must survive a reload — a persisted store is a
	 * schema you now have to migrate, and stale persisted state is one of the
	 * hardest classes of bug to reproduce because it only affects people who
	 * used an earlier build.
	 */
	persistKey?: string;

	/**
	 * Which slice of the state to persist. Required when `persistKey` is set:
	 * persisting the whole store by default is how transient flags and
	 * in-flight state end up frozen into localStorage.
	 */
	partialize?: (state: T) => Partial<T>;

	/**
	 * Validates what comes back out of storage. Required alongside
	 * `persistKey`, and it describes the shape `partialize` writes — not the
	 * whole state.
	 *
	 * **localStorage is an untrusted input**, and it is the one boundary that
	 * is easy to forget because the value looks like it came from your own
	 * code. It did — from a *previous build* of your own code, or from a
	 * devtools console, or from whatever an extension wrote under your origin.
	 *
	 * Without this the rehydrated value is cast to the state type and believed.
	 * Measured against this template's own session store before the check
	 * existed: `{"state":{"session":"not-an-object"}}` in localStorage put the
	 * app past the `(auth)` guard and onto the protected page, because the
	 * guard tests `!context.session` — and a non-empty string is truthy. A
	 * missing `displayName` sailed through the same way, which is the case
	 * that hits real users with no malice at all: ship a v2 that adds a field,
	 * and every existing session is a lie the types cannot see.
	 *
	 * `version`/`migrate` do not cover this. They fire only when the stored
	 * integer differs from `version` — a self-reported number sitting in the
	 * same untrusted blob — and their only remedy without a `migrate` is to
	 * discard everything, which signs the user out silently.
	 */
	persistSchema?: SyncSchema<Partial<T>>;

	/** Bump when a persisted shape changes, and pair with `migrate`. */
	version?: number;
	migrate?: (persisted: unknown, version: number) => T | Promise<T>;
};

/**
 * Build a store with the workspace's middleware conventions applied.
 *
 * DevTools are wired unconditionally — the extension is what reads them, so
 * there is nothing to strip, and a store you cannot inspect in a bug report is
 * the reason this factory exists rather than bare `create()` calls.
 */
export function createAppStore<T>(
	initializer: StateCreator<T, [], []>,
	options: CreateAppStoreOptions<T>,
) {
	const { name, persistKey, partialize, persistSchema, version, migrate } =
		options;

	if (persistKey && !partialize) {
		throw new Error(
			`createAppStore("${name}"): persistKey requires partialize. Persisting a whole store freezes transient state into localStorage, where it outlives the reason it existed.`,
		);
	}

	// Thrown rather than defaulted to "no validation", for the same reason as
	// `partialize` above: the failure it prevents is invisible in development,
	// where localStorage only ever holds what the current build just wrote.
	// Making it required is what turns validating a persisted shape from
	// something a consumer must remember into something they receive.
	if (persistKey && !persistSchema) {
		throw new Error(
			`createAppStore("${name}"): persistKey requires persistSchema. Rehydrated state is an untrusted input — it comes from an older build, another tab, or the console — and without a schema it is cast to the state type and believed.`,
		);
	}

	if (!persistKey) {
		return create<T>()(devtools(initializer, { name }));
	}

	return create<T>()(
		devtools(
			persist(initializer, {
				name: persistKey,
				partialize: partialize as (state: T) => T,

				// Spread-if-present, not `version, migrate,`. zustand builds its
				// options as `{ version: 0, ...yours }`, so passing the keys
				// explicitly overrides its default with `undefined` — and a
				// store that declares no version then writes a blob with no
				// `version` field, while every later comparison is against
				// `undefined` rather than `0`. The visible symptom is a valid
				// persisted value being discarded as "needs migration".
				...(version !== undefined ? { version } : {}),
				...(migrate ? { migrate } : {}),

				// The validation seam. `merge` receives the raw rehydrated value
				// — after `migrate`, before it reaches the store — and whatever
				// it returns becomes the initial state.
				//
				// The default `merge` is a shallow spread, so this reproduces it
				// and adds the gate. On failure the initializer's own defaults
				// stand: a signed-out session and the default theme, which is the
				// state a first-time visitor gets. Degrading to "new user" beats
				// both alternatives — throwing white-screens the app over a value
				// nobody asked for, and proceeding hands every downstream
				// consumer a value its type is lying about.
				//
				// The bad entry is left in storage rather than cleared, because
				// the store overwrites it on the first state change anyway and
				// reaching into the storage adapter here would break any consumer
				// that swaps localStorage for something else.
				merge: (persisted, current) => {
					if (persisted === undefined || persisted === null) return current;

					const result = (persistSchema as SyncSchema<Partial<T>>).safeParse(
						persisted,
					);

					if (!result.success) {
						log.warn(
							`Discarded persisted state for "${persistKey}" — it did not match the store's schema. Falling back to defaults.`,
							result.error,
						);
						return current;
					}

					return { ...current, ...result.data };
				},
			}),
			{ name },
		),
	);
}
