import { z } from "zod";

import { STATUS_FILTERS } from "@/entities/item";
import { paginationSearchSchema, querySearchSchema } from "@/shared/lib/search";

/**
 * The URL is the state, and this is the one declaration of what it holds.
 *
 * **Here rather than in the route file**, and the type below is INFERRED from
 * it rather than written beside it. Both halves of that matter.
 *
 * The schema used to live in `routes/(auth)/(shell)/items/index.tsx` while a
 * hand-written `ItemsSearch` lived in `items.filters.ts`, with nothing
 * connecting them: the schema was read once, by `validateSearch`, and the type
 * was read by fourteen call sites. They had already drifted. `pageSize` was
 * `PageSize` in the schema and plain `number` in the type, so
 * `applyPageSize(search, 999)` type-checked, wrote `?pageSize=999`, and the
 * schema's `.catch(20)` silently put it back to 20 — the type failed at the
 * single thing it existed to prevent, and the runtime hid the evidence.
 *
 * Living in `pages/` keeps the FSD direction intact: the route already imports
 * `ItemsPage` and `itemsListParams` from here, so routes → pages is the
 * established edge. The reverse would not be.
 *
 * `.partial()` is deliberately NOT applied: every key has a `.default()`, so
 * the parsed result is always complete and a `<Link to="/items">` with no
 * search still type-checks. Without defaults it would have to supply all four.
 */
export const itemsSearchSchema = z.object({
	...paginationSearchSchema(20),
	...querySearchSchema(),
	status: z.enum(STATUS_FILTERS).catch("all").default("all"),
});

/**
 * Inferred, never re-declared.
 *
 * `z.infer` gives the OUTPUT type, which is exactly what `validateSearch`
 * hands the page — so this is the same type the router produces rather than a
 * description of it. Adding a key to the schema reaches every consumer with
 * nothing to update by hand; changing one narrows every consumer at once.
 */
export type ItemsSearch = z.infer<typeof itemsSearchSchema>;

/**
 * Fed to `stripSearchParams` so `?page=1&pageSize=20&status=all` stays out of
 * the URL. Beside the schema because they have to agree: a default here that
 * the schema does not also default to would strip a param the route then
 * cannot reconstruct.
 */
export const ITEMS_SEARCH_DEFAULTS = {
	page: 1,
	pageSize: 20,
	status: "all",
} as const;
