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

export type SelectableStatus = (typeof SELECTABLE_STATUSES)[number];

/**
 * The same set, spelled the way a DOM control has to spell it.
 *
 * A `<select>` value is a string and there is no way around that, so the form
 * layer needs the statuses as `"1" | "2" | "3"`. It lives here, beside the set
 * it mirrors, because the *vocabulary* belongs to the status domain even
 * though the reason for it belongs to the DOM — and because writing it in the
 * form means two lists that can disagree about which statuses are offered.
 *
 * The template-literal type is what keeps it honest: add a member to
 * `SELECTABLE_STATUSES` and `StatusValue` grows with it, with nothing to
 * update by hand.
 */
export type StatusValue = `${SelectableStatus}`;

/**
 * The one place `String()`'s widening is reasserted.
 *
 * TypeScript types `String(1)` as `string` and nothing can prove otherwise, so
 * exactly one assertion is unavoidable. Making it a named function keeps it to
 * one — and asserting `StatusValue` PRESERVES the union, where the previous
 * `as [string, ...string[]]` at the `z.enum` call site erased it and handed
 * every consumer a bare `string`.
 */
export function statusToValue(status: SelectableStatus): StatusValue {
	return String(status) as StatusValue;
}

export const STATUS_VALUES = SELECTABLE_STATUSES.map(statusToValue);

/**
 * Back from the control's string to the enum.
 *
 * A lookup rather than `Number(value) as ItemStatus`. The cast version is
 * unchecked in the direction that matters — it will manufacture a status the
 * server never defined out of any string that parses as a number — and it was
 * only ever needed because the schema's type had been widened to `string`.
 * Now the input is proven and the output is found, not asserted.
 */
export function statusFromValue(value: StatusValue): SelectableStatus {
	return (
		SELECTABLE_STATUSES.find((status) => statusToValue(status) === value) ??
		SELECTABLE_STATUSES[0]
	);
}

/**
 * The status a form should start on, for any status the server might send.
 *
 * Two ways a status can be outside the offered set, neither exotic. A proto3
 * scalar is absent on the wire when it holds the zero value, so a server that
 * never set one sends something that decodes to `UNSPECIFIED`. And proto3
 * enums are OPEN: a server that adds a status this build has never heard of
 * decodes to that raw number.
 *
 * `.find` and not `status ?? DRAFT`, which is the bug this replaces: `??` is
 * nullish-only and `UNSPECIFIED` is `0`, so the fallback could not fire for
 * the one value it looked like it handled.
 */
export function defaultSelectableStatus(
	status: ItemStatus | undefined,
): SelectableStatus {
	return (
		SELECTABLE_STATUSES.find((selectable) => selectable === status) ??
		SELECTABLE_STATUSES[0]
	);
}

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

/**
 * Stable keys for copy lookup. Never the enum's number — that is wire detail.
 *
 * Returns `"unknown"`, never `"all"`. `"all"` is filter vocabulary and renders
 * as "All statuses", so a row the server sent with an unset or newer status
 * would display as though it were every status at once.
 */
export type StatusDisplayKey = Exclude<StatusFilter, "all"> | "unknown";

export function statusKey(status: ItemStatus): StatusDisplayKey {
	switch (status) {
		case Status.DRAFT:
			return "draft";
		case Status.ACTIVE:
			return "active";
		case Status.ARCHIVED:
			return "archived";
		case Status.UNSPECIFIED:
			return "unknown";
		default:
			// `satisfies never` is the alarm: add a member to the proto enum and
			// this line stops compiling, which is the only signal that a row can
			// now arrive with a status no screen knows how to label.
			status satisfies never;
			return "unknown";
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
