import { z } from "zod";

/**
 * Who is signed in.
 *
 * The shape is deliberately minimal — an app replaces it with whatever its
 * auth returns. What matters for the template is where it LIVES: in a store,
 * not in the query cache, because it is cross-cutting client state that the
 * router's guards read synchronously.
 *
 * Declared as a schema with the type INFERRED from it, rather than the other
 * way round. The type alone describes what this app believes; the schema is
 * what can check that belief against a value it did not construct — and this
 * shape is rehydrated from localStorage on every load, which is exactly such a
 * value. Writing both by hand would let them drift, and the drift would be
 * silent in the direction that matters: a field added to the type but not the
 * schema is a field nothing validates.
 *
 * `.min(1)` on both, because `""` is the failure mode a bare `z.string()`
 * waves through — an empty `displayName` renders as a blank avatar with no
 * hint of why.
 */
export const sessionSchema = z.object({
	userId: z.string().min(1),
	displayName: z.string().min(1),
});

export type Session = z.infer<typeof sessionSchema>;
