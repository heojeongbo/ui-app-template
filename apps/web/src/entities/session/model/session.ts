/**
 * Who is signed in.
 *
 * The shape is deliberately minimal — an app replaces it with whatever its
 * auth returns. What matters for the template is where it LIVES: in a store,
 * not in the query cache, because it is cross-cutting client state that the
 * router's guards read synchronously.
 */
export type Session = {
	userId: string;
	displayName: string;
};
