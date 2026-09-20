import type { Interceptor } from "@connectrpc/connect";

import { itemMocks } from "./item.mock";

/**
 * Every locally-answered RPC, in one list.
 *
 * Registering here is what makes the swap to a real server a DELETION: remove
 * the entry and the call goes out over the wire, with no other change anywhere
 * in the app. That is the whole point of mocking at the interceptor layer
 * rather than inside the data hooks.
 */
export const mockInterceptors: Interceptor[] = [...itemMocks];

export { buildItem, buildItems } from "./item.fixtures";
export { resetItemStore } from "./item.mock";
