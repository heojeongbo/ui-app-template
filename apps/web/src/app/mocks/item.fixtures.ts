import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { proto } from "@template/interfaces";

type Item = proto.example_v1.Item;

/**
 * Fixture data, generated **deterministically**.
 *
 * No `Math.random()` and no `Date.now()`. A fixture that differs between runs
 * makes a failing test unreproducible and makes a screenshot diff meaningless;
 * worse, it hides ordering bugs behind data that happens to be sorted today.
 *
 * Exported as a synchronous builder so a test can call it directly rather than
 * mounting a hook and waiting — see items.scenario.test.ts.
 */

/** djb2. Small, stable, and enough to spread values without a dependency. */
function hash(input: string): number {
	let h = 5381;
	for (let i = 0; i < input.length; i += 1) {
		h = (h * 33) ^ input.charCodeAt(i);
	}
	return Math.abs(h);
}

const STATUSES = [
	proto.example_v1.ItemStatus.DRAFT,
	proto.example_v1.ItemStatus.ACTIVE,
	proto.example_v1.ItemStatus.ACTIVE,
	proto.example_v1.ItemStatus.ARCHIVED,
] as const;

const WORDS = [
	"widget",
	"bracket",
	"housing",
	"spindle",
	"gasket",
	"flange",
	"coupler",
	"bearing",
] as const;

/** A fixed instant, so `createdAt` is the same on every run. */
const EPOCH = new Date("2026-01-01T00:00:00.000Z");

export function buildItem(index: number): Item {
	const seed = hash(`item-${index}`);
	const word = WORDS[seed % WORDS.length] as string;
	const created = new Date(EPOCH.getTime() + index * 3_600_000);

	return create(proto.example_v1.ItemSchema, {
		id: `itm_${String(index).padStart(4, "0")}`,
		name: `${word} ${index}`,
		description: `A ${word} used in assembly step ${(seed % 9) + 1}.`,
		status: STATUSES[seed % STATUSES.length],
		createdAt: timestampFromDate(created),
		updatedAt: timestampFromDate(created),
	});
}

/**
 * A fixed catalogue. 47 rather than a round 50 so pagination has a partial
 * last page — the case where an off-by-one actually shows up.
 */
export function buildItems(count = 47): Item[] {
	return Array.from({ length: count }, (_, index) => buildItem(index + 1));
}
