import { createQueryClient } from "@template/core/query";

/**
 * One QueryClient, at module scope.
 *
 * Module scope and not `useState(() => createQueryClient())`: the router's
 * loaders need it before React renders anything, and it is handed to
 * `createAppRouter` as router context. A client created inside a component
 * would not exist yet at that point.
 *
 * The trade-off module scope normally carries — one cache shared across
 * "users" — does not apply to a browser SPA, where the module graph is torn
 * down on navigation away. It WOULD apply under SSR, which this template does
 * not do; if you add it, move this into a per-request factory.
 */
export const queryClient = createQueryClient();
