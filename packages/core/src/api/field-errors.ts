import { Code, ConnectError } from "@connectrpc/connect";
import type { ServerFieldError } from "@template/design/ui/form";

/**
 * Pulls `{ field, message }` pairs out of a transport error.
 *
 * This is the half of server-error mapping that knows the wire format. The
 * design system's `applyServerFieldErrors` takes the pairs and knows nothing
 * about ConnectRPC — that split is what lets either side be replaced alone.
 *
 * Two sources, tried in order:
 *
 * 1. **Structured details.** A server that wants to be precise attaches them
 *    (`google.rpc.BadRequest` and friends). Preferred when present.
 * 2. **A `field: message` convention in the error text.** Most servers do not
 *    ship details, and a plain `InvalidArgument` saying `email: already
 *    registered` is the pragmatic middle ground. Parsing it is a convention,
 *    not a standard — which is why it is confined to this one function and
 *    documented as replaceable.
 *
 * Returns `[]` for anything that is not a field-level rejection, so the caller
 * falls through to its generic error handling.
 */
export function extractFieldErrors(error: unknown): ServerFieldError[] {
	if (!(error instanceof ConnectError)) return [];

	// Only InvalidArgument and AlreadyExists describe a problem with specific
	// input. A PermissionDenied is not about a field, and attaching it to one
	// would send the user editing something that was never the issue.
	if (
		error.code !== Code.InvalidArgument &&
		error.code !== Code.AlreadyExists
	) {
		return [];
	}

	const structured = fromDetails(error);
	if (structured.length > 0) return structured;

	return fromMessage(error.rawMessage);
}

/**
 * Reads details the server attached as `{ field, description }` payloads.
 *
 * Kept deliberately duck-typed: binding to a specific `google.rpc` schema
 * would make this package depend on those generated types, and different
 * backends attach different (but structurally identical) messages.
 */
function fromDetails(error: ConnectError): ServerFieldError[] {
	const out: ServerFieldError[] = [];

	for (const detail of error.details) {
		const value = (detail as { value?: unknown }).value;
		if (!value || typeof value !== "object") continue;

		const violations = (value as { fieldViolations?: unknown }).fieldViolations;
		if (!Array.isArray(violations)) continue;

		for (const violation of violations) {
			if (!violation || typeof violation !== "object") continue;
			const { field, description } = violation as {
				field?: unknown;
				description?: unknown;
			};
			if (typeof field === "string" && typeof description === "string") {
				out.push({ field, message: description });
			}
		}
	}

	return out;
}

/**
 * Parses `field: message` lines.
 *
 * Conservative on purpose: a colon is common in ordinary prose, so a line only
 * counts when what precedes the colon looks like a field path and nothing
 * else — no spaces, and only the characters a path can contain. "Could not
 * save: try again" is left alone rather than attached to a field named
 * "Could not save".
 */
function fromMessage(message: string): ServerFieldError[] {
	const FIELD_PATH =
		/^([a-zA-Z_$][\w$]*(?:(?:\.[a-zA-Z_$][\w$]*)|(?:\[\d+\]))*): (.+)$/;

	return message
		.split("\n")
		.map((line) => FIELD_PATH.exec(line.trim()))
		.filter((match): match is RegExpExecArray => match !== null)
		.map((match) => ({
			field: match[1] as string,
			message: match[2] as string,
		}));
}
