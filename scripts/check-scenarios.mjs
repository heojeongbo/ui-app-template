#!/usr/bin/env node
/**
 * `pnpm scenario:check` — hold every screen spec and its tests to each other.
 *
 * The spec→test loop is the part of this template that decays fastest, because
 * both halves keep working while they drift: a scenario nobody tested still
 * reads like a promise, and a test naming a scenario nobody specified still
 * passes. Neither is visible to a reader skimming one file.
 *
 * This existed as item 5 on a checklist in CLAUDE.md — "does every `S<n>` still
 * have exactly one test?" — which is to say it did not exist. The template's
 * own position is that layer boundaries are enforced by `pnpm fsd:check` and
 * not by review; this is the same argument applied to the convention the
 * template is actually built around.
 *
 * Three failures, and each is a different mistake:
 *
 *   1. UNCOVERED  — the spec promises an outcome nothing asserts.
 *   2. ORPHANED   — a test names an `S<n>` the spec no longer has. Usually a
 *                   scenario was renumbered or deleted and the test survived,
 *                   which means it is now asserting something undocumented.
 *   3. UNSPECIFIED — a screen exists under `pages/` with no spec at all.
 *
 * Read-only. It never writes, so it is safe on a pre-push hook and in CI.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = path.join(root, "apps/web/docs/screens");
const PAGES_DIR = path.join(root, "apps/web/src/pages");
const PENDING = path.join(PAGES_DIR, "pending-screens.scenario.test.ts");

/** `S12. Some sentence.` at the start of a line — the spec's scenario form. */
const SPEC_SCENARIO = /^S(\d+)\./gm;
/** `it("S12: …")` / `it.todo("S12: …")` — the test's form. */
const TEST_SCENARIO = /\bit(?:\.todo)?\(\s*\n?\s*["'`]S(\d+):/g;

function read(file) {
	return fs.readFileSync(file, "utf8");
}

function matchesOf(text, pattern) {
	// `matchAll` needs a fresh lastIndex each call; these regexes are module
	// scope and stateful with /g.
	pattern.lastIndex = 0;
	return new Set([...text.matchAll(pattern)].map((m) => Number(m[1])));
}

/** Every spec, as `slug -> Set<scenario number>`. */
function readSpecs() {
	const specs = new Map();
	for (const entry of fs.readdirSync(SPEC_DIR)) {
		if (!entry.endsWith(".md") || entry === "README.md") continue;
		const slug = entry.slice(0, -".md".length);
		specs.set(slug, matchesOf(read(path.join(SPEC_DIR, entry)), SPEC_SCENARIO));
	}
	return specs;
}

/**
 * Scenario numbers a BUILT screen's tests claim.
 *
 * Any test file in the slice counts, not only `*.scenario.test.ts` — a screen
 * is free to split its scenarios across files, and requiring one filename
 * would make the check about naming rather than about coverage.
 */
function testedInSlice(slug) {
	const dir = path.join(PAGES_DIR, slug);
	if (!fs.existsSync(dir)) return null;

	const found = new Set();
	for (const entry of fs.readdirSync(dir)) {
		if (!/\.test\.tsx?$/.test(entry)) continue;
		for (const n of matchesOf(read(path.join(dir, entry)), TEST_SCENARIO)) {
			found.add(n);
		}
	}
	return found;
}

/**
 * Scenario numbers an UNBUILT screen's placeholders claim.
 *
 * Blocks are matched by `describe("<slug> …")`, which is why the convention is
 * to open with the spec's filename rather than a prose name.
 */
function testedInPending(slug) {
	if (!fs.existsSync(PENDING)) return new Set();

	const text = read(PENDING);
	const opener = new RegExp(`describe\\(\\s*["'\`]${slug}\\b`, "g");
	const start = opener.exec(text)?.index;
	if (start === undefined) return new Set();

	// To the next `describe(` at column 0, or the end. Good enough because this
	// file is flat by construction: one describe per unbuilt screen, no nesting.
	const rest = text.slice(start + 1);
	const nextIndex = rest.search(/\ndescribe\(/);
	const block = nextIndex === -1 ? rest : rest.slice(0, nextIndex);
	return matchesOf(block, TEST_SCENARIO);
}

/** Directories under `pages/` that are screens. */
function screenSlugs() {
	return fs
		.readdirSync(PAGES_DIR, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name);
}

const specs = readSpecs();
const problems = [];

for (const [slug, scenarios] of specs) {
	// The UNION of both homes, not whichever exists.
	//
	// A screen's directory existing does not mean its scenarios have moved out
	// of `pending-screens`. That is the normal state immediately after
	// `pnpm new:screen`, and again for every scenario still to be written — and
	// preferring the slice when it exists made the scaffold produce a red build
	// on its very first run, which this round-trip caught.
	const inSlice = testedInSlice(slug);
	const inPending = testedInPending(slug);
	const tested = new Set([...(inSlice ?? []), ...inPending]);
	const where =
		inSlice === null
			? "pending-screens.scenario.test.ts"
			: `pages/${slug}/ or pending-screens.scenario.test.ts`;

	for (const n of [...scenarios].sort((a, b) => a - b)) {
		if (!tested.has(n)) {
			problems.push(
				`UNCOVERED   ${slug}.md S${n} — no test names it (looked in ${where})`,
			);
		}
	}
	for (const n of [...tested].sort((a, b) => a - b)) {
		if (!scenarios.has(n)) {
			problems.push(
				`ORPHANED    ${where} names S${n}, which ${slug}.md does not specify`,
			);
		}
	}
}

for (const slug of screenSlugs()) {
	if (!specs.has(slug)) {
		problems.push(
			`UNSPECIFIED pages/${slug}/ has no apps/web/docs/screens/${slug}.md`,
		);
	}
}

if (problems.length > 0) {
	console.error("Screen specs and scenario tests disagree:\n");
	for (const p of problems) console.error(`  ${p}`);
	console.error(
		`\n${problems.length} problem(s). See apps/web/docs/screens/README.md.`,
	);
	process.exit(1);
}

const total = [...specs.values()].reduce((n, s) => n + s.size, 0);
console.log(`Scenarios: ${total} across ${specs.size} spec(s), all covered.`);
