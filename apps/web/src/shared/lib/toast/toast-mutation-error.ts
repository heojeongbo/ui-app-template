import { isAbortError, isDefiniteFailure } from "@template/core/api";
import { createScopedLogger } from "@template/core/logger";
import { toast } from "sonner";

const log = createScopedLogger("Api");

/**
 * Report a failed mutation to the user, with the tone the failure deserves.
 *
 * This is the ONLY thing wrapped around `toast`. Wrapping toast itself would
 * add indirection over an API that is already the vocabulary; what genuinely
 * needs to happen in one place is the **classification**, because getting it
 * wrong is how a user is told a write failed when it landed.
 *
 * The tone table (docs/ux/mutations.md):
 *
 * | Tone | Means |
 * | --- | --- |
 * | `success` | It completed. |
 * | `info` | Acknowledged / applied / toggled. |
 * | `warning` | Partial, or we cannot confirm the outcome. |
 * | `error` | A **definite** failure — the server refused. |
 *
 * @param definite  Shown when the server gave a verdict. The user must change
 *                  something; retrying unchanged will fail identically.
 * @param indeterminate Shown when the answer was lost. The write MAY have
 *                  happened, so this must not claim otherwise.
 */
export function toastMutationError(
	error: unknown,
	{ definite, indeterminate }: { definite: string; indeterminate: string },
): void {
	// An aborted request is the app working correctly — a cancelled query, a
	// closed dialog. A toast for one is noise that trains people to ignore
	// toasts, so it is dropped entirely.
	if (isAbortError(error)) {
		log.debug("mutation aborted");
		return;
	}

	log.error("mutation failed", error);

	if (isDefiniteFailure(error)) {
		toast.error(definite);
	} else {
		toast.warning(indeterminate);
	}
}
