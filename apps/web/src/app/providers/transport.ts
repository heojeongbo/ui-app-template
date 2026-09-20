import { createTransport } from "@template/core/api";
import { env } from "@template/core/config";

import { mockInterceptors } from "@/app/mocks";
import { sessionStore } from "@/entities/session";

/**
 * The app's one transport.
 *
 * Mocks are spliced in only when explicitly enabled AND only in a dev build —
 * two conditions, because a mock reaching production answers real requests
 * with fixtures and looks like a data corruption bug.
 *
 * `onUnauthenticated` is injected rather than reached for, which is what keeps
 * the transport testable and lets the auth store stay unaware of it.
 */
export const transport = createTransport({
	baseUrl: env.VITE_API_BASE_URL,
	protocol: env.VITE_API_PROTOCOL,
	onUnauthenticated: () => {
		// Clear the session. The router's guard re-runs because the store
		// changed, which is what performs the actual navigation — no imperative
		// `router.navigate` from outside React is needed.
		sessionStore.signOut();
	},
	interceptors:
		import.meta.env.DEV && env.VITE_ENABLE_MOCKS ? mockInterceptors : [],
});
