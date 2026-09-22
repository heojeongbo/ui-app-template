/**
 * Scenarios for screens that do not exist yet.
 *
 * **This file imports nothing.** That is the whole point: a screen can be
 * specified, reviewed and agreed before a single line of it is written, and
 * none of it can break the build. When the screen lands, move its `describe`
 * block into `pages/<screen>/<screen>.scenario.test.ts` and keep the numbers —
 * the spec's S1 stays S1.
 *
 * `it.todo` reports as pending rather than passing, so an unbuilt screen is
 * visible in the test output instead of being indistinguishable from a
 * finished one.
 *
 * Specs live in ../../docs/screens/.
 */
import { describe, it } from "vitest";

// Spec: ../../docs/screens/item-detail.md
//
// The describe text starts with the spec's FILENAME — `item-detail`, not
// "item detail". `pnpm scenario:check` matches a pending block to its spec by
// that slug, so the convention is what makes the check a lookup rather than a
// guess at how someone spelled the screen's name in prose.
describe("item-detail (not built)", () => {
	it.todo("S1: shows the item's full description and timestamps");
	it.todo(
		"S2: editing a single field sends only that field in the update mask",
	);
	it.todo("S3: a deleted item shows a not-found state, not an error");
});
