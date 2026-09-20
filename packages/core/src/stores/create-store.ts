import { create, type StateCreator } from "zustand";
import { devtools, persist } from "zustand/middleware";

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
	const { name, persistKey, partialize, version, migrate } = options;

	if (persistKey && !partialize) {
		throw new Error(
			`createAppStore("${name}"): persistKey requires partialize. Persisting a whole store freezes transient state into localStorage, where it outlives the reason it existed.`,
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
				version,
				migrate,
			}),
			{ name },
		),
	);
}
