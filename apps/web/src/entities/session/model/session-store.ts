import { createAppStore } from "@template/core/stores";
import { z } from "zod";

import { type Session, sessionSchema } from "./session";

type SessionState = {
	session: Session | null;
	signIn: (session: Session) => void;
	signOut: () => void;
};

/**
 * The signed-in user.
 *
 * One of the few things that genuinely belongs in a store: the router's
 * `beforeLoad` guards read it synchronously on every navigation, so it cannot
 * be a query, and every layer needs it, so it cannot be local state.
 *
 * Persisted because a page reload must not sign the user out. Only `session`
 * is persisted — `partialize` is required by the factory for exactly this
 * reason, so the actions are not frozen into localStorage alongside it.
 *
 * NOTE: this persists the *identity*, not the credential. The session cookie
 * is HttpOnly and lives outside JS; what is here is display state, and a stale
 * copy is corrected the moment the server answers `Unauthenticated` and the
 * transport's auth interceptor calls `signOut`.
 */
export const useSessionStore = createAppStore<SessionState>()(
	(set) => ({
		session: null,
		signIn: (session) => set({ session }),
		signOut: () => set({ session: null }),
	}),
	{
		name: "session",
		persistKey: "template.session",
		partialize: (state) => ({ session: state.session }),

		// Guards the way back IN. `partialize` says what gets written;
		// this says what is allowed to come back, and it is the only thing
		// standing between localStorage and `RouterContext.session`.
		//
		// `.nullable()` and not `.optional()`: signed-out is a value this store
		// writes on purpose, and it has to round-trip. A missing key is
		// something else — an older build, or a hand-edited entry — and falls
		// back to the initializer's `null`, which lands in the same place.
		persistSchema: z.object({ session: sessionSchema.nullable() }),

		version: 1,
	},
);

/**
 * Read the session outside React.
 *
 * The transport's `onUnauthenticated` handler and the router both need it, and
 * neither is inside a component. Zustand's `getState` is the sanctioned escape
 * hatch; reaching for a module-level mutable instead is what makes auth state
 * untestable.
 */
export const sessionStore = {
	get: () => useSessionStore.getState().session,
	signOut: () => useSessionStore.getState().signOut(),
};
