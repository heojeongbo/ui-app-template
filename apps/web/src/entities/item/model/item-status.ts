import { proto } from "@template/interfaces";

type ItemStatus = proto.example_v1.ItemStatus;
const { ItemStatus: Status } = proto.example_v1;

/**
 * Status, as the UI needs to talk about it.
 *
 * A pure module, and that is the architectural point rather than an
 * implementation detail: a scenario test never renders, so any decision a
 * scenario asserts has to live in a `.ts` like this one. A status-to-colour
 * ternary written inline in JSX is unreachable to a test and has to be
 * extracted before it can be covered. See docs/page-triad.md.
 */

/** The statuses a user can pick, in the order they should be offered. */
export const SELECTABLE_STATUSES = [
	Status.DRAFT,
	Status.ACTIVE,
	Status.ARCHIVED,
] as const;

/**
 * The filter vocabulary, which is the selectable set plus "don't filter".
 *
 * `"all"` is a UI concept, not a proto one — it maps to `UNSPECIFIED` on the
 * wire. Keeping the two vocabularies separate is what stops a filter nobody
 * chose from excluding everything.
 */
export const STATUS_FILTERS = ["all", "draft", "active", "archived"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

const FILTER_TO_STATUS: Record<StatusFilter, ItemStatus> = {
	all: Status.UNSPECIFIED,
	draft: Status.DRAFT,
	active: Status.ACTIVE,
	archived: Status.ARCHIVED,
};

export function statusFromFilter(filter: StatusFilter): ItemStatus {
	return FILTER_TO_STATUS[filter];
}

/** Stable keys for copy lookup. Never the enum's number — that is wire detail. */
export function statusKey(status: ItemStatus): StatusFilter {
	switch (status) {
		case Status.DRAFT:
			return "draft";
		case Status.ACTIVE:
			return "active";
		case Status.ARCHIVED:
			return "archived";
		default:
			// UNSPECIFIED reaching a row means the server sent a status this build
			// does not know — a newer enum member, most likely. Rendering it as
			// "all" would be nonsense, so treat it as the neutral case.
			return "all";
	}
}

export type StatusTone = "neutral" | "success" | "muted";

/**
 * Which semantic tone a status renders in.
 *
 * Returns a TONE, not a class string. The design system owns what
 * `success` looks like; this module owns which statuses are successful. Mixing
 * the two is how a palette change turns into a search-and-replace.
 */
export function statusTone(status: ItemStatus): StatusTone {
	switch (status) {
		case Status.ACTIVE:
			return "success";
		case Status.ARCHIVED:
			return "muted";
		default:
			return "neutral";
	}
}
