/**
 * The editor's length limits.
 *
 * One declaration, read by both the schema (`.max(ITEM_LIMITS.name)`) and the
 * message that explains it. They used to be two literals in two files, and the
 * failure that shape produces is silent: someone raises the schema's `120` to
 * `200`, the message still says 120, and the user is told a rule that is no
 * longer true.
 *
 * KNOWN LIMIT: `.max()` counts UTF-16 code units, so an emoji costs 2 and a
 * combining sequence costs more than it looks. "120 characters" is therefore
 * approximate for non-Latin input. Fixing it means agreeing with the server
 * about what it counts — a client that is laxer than the server turns a clean
 * inline error into a failed request.
 */
export const ITEM_LIMITS = {
	name: 120,
	description: 2000,
} as const;
