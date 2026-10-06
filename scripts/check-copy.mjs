#!/usr/bin/env node
/**
 * The copy seam, actually enforced.
 *
 * The template's position is that a convention you have to remember is a
 * convention that decays: layer boundaries are held by `pnpm fsd:check`, the
 * spec-to-test loop by `pnpm scenario:check`, `console` by Biome. Copy was the
 * one rule stated in four documents and checked by nobody — and it had already
 * drifted in five places by the time anyone looked.
 *
 * What each verdict means, and the mistake it names:
 *
 *   ENGINE     `biome search` stopped finding what it used to. The search
 *              command is EXPERIMENTAL; if its GritQL or its output format
 *              changes, every query below silently returns nothing and the
 *              build stays green while the check stops checking — strictly
 *              worse than not having it. The canary fixture is what turns that
 *              into a failure.
 *
 *   INLINE     A user-facing string written into JSX in `apps/web`. It renders
 *              fine, which is why this decays one component at a time. Move it
 *              to the screen's `*.content.ts`.
 *
 *   SHIPPED    A user-facing string in `packages/core` or `packages/design`
 *              outside `ui/primitive/`. A component there is used by screens
 *              whose language differs, so a hardcoded word is a decision the
 *              consuming app cannot undo. Take it as a prop.
 *
 *   DORMANT    A CLI-owned primitive ships copy AND something outside
 *              `ui/primitive/` imports its wrapper. Upstream's source is
 *              upstream's to word — but the moment the app uses it, those
 *              words are on screen in a language nobody chose. Wrap it like
 *              `ui/dialog/dialog.tsx`. A warning until the import exists,
 *              because wrapping a component nothing uses is work redone later.
 *
 *   UNSEAMED   A screen folder with no content module. `pnpm new:screen`
 *              scaffolds one; this catches the folder made by hand.
 *
 *   KEYLESS    A `*.content.ts` that is not a dictionary — no `key:`. Intlayer
 *              skips it with a line on stdout nobody reads, and every string
 *              in it silently stops being translatable.
 *
 * Read-only: it spawns `biome search` and reads files, and changes nothing.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Attributes whose value a user reads. A CLOSED SET, and that is the single
 * biggest lever on whether people trust this check: the default answer to "is
 * this attribute copy?" is NO, so `className`, `data-*`, `aria-hidden`,
 * `aria-current`, `role`, `type`, `href` and every other token-valued
 * attribute are not-flagged by construction rather than by a suppression list.
 */
const COPY_ATTRIBUTES = [
	"aria-label",
	"aria-description",
	"aria-roledescription",
	"aria-placeholder",
	"aria-valuetext",
	"alt",
	"placeholder",
	"title",
];

/** Each entry carries the reason it is excluded, so nobody has to guess. */
const SKIP = [
	// A test's fixtures are its subject.
	/\.(test|spec)\.tsx?$/,
	// A stand-in SERVER. Its messages are wire payloads, and the app already
	// routes them through `toUserMessage()` with a dictionary fallback.
	/apps\/web\/src\/app\/mocks\//,
	// CLI-owned upstream source. Feeds DORMANT instead.
	/packages\/design\/src\/ui\/primitive\//,
	// Log scopes and protocol names are technical tokens, explicitly allowed to
	// stay hardcoded in a shared package (docs/ux/copy.md).
	/packages\/core\/src\/logger\//,
	// stdout is these files' user interface — the same carve-out biome.jsonc
	// already makes for `noConsole`.
	/(^|\/)scripts\//,
	/\.config\.[cm]?[jt]s$/,
	// Generated.
	/\.gen\.ts$/,
	/_pb\.ts$/,
	/\/gen(-calque)?\//,
	/\.intlayer\//,
];

const skipped = (file) => SKIP.some((re) => re.test(file));

/** `// copy-check-ignore: <reason>` — the reason is required. */
function ignoredAt(lines, lineNumber) {
	const here = lines[lineNumber - 1] ?? "";
	const above = lines[lineNumber - 2] ?? "";
	const RE = /copy-check-ignore:\s*\S+/;
	return RE.test(here) || RE.test(above);
}

/** Run one GritQL pattern and return `{ file, line }` for every match. */
function search(pattern, targets) {
	const result = spawnSync(
		"pnpm",
		["exec", "biome", "search", pattern, ...targets, "--colors=off"],
		{ cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	);

	if (result.status !== 0 && !result.stdout) {
		return { failed: true, matches: [] };
	}

	const matches = [];
	for (const line of (result.stdout ?? "").split("\n")) {
		const m = /^(\S+?):(\d+):\d+ search/.exec(line);
		if (m?.[1] && m[2]) matches.push({ file: m[1], line: Number(m[2]) });
	}
	return { failed: false, matches };
}

/** Prose, not punctuation or whitespace between tags. */
const PROSE = '`$t` where { $t <: jsx_text(), $t <: r"(?s).*[A-Za-z]{2}.*" }';

const problems = [];
const warnings = [];
let ignoredCount = 0;

// --- ENGINE ----------------------------------------------------------------
// Before trusting a single empty result, prove the engine still finds things.
const canary = search(PROSE, ["scripts/fixtures/copy-canary.tsx"]);
if (canary.failed || canary.matches.length !== 1) {
	console.error(
		`ENGINE  biome search found ${canary.matches.length}/1 canary match(es).\n` +
			"        GritQL support or the output format changed — every query below\n" +
			"        would now pass by finding nothing. See scripts/check-copy.mjs.",
	);
	process.exit(1);
}

// --- INLINE / SHIPPED ------------------------------------------------------
const textHits = search(PROSE, [
	"apps/web/src",
	"packages/core/src",
	"packages/design/src",
]);
if (textHits.failed) {
	console.error("ENGINE  biome search failed to run.");
	process.exit(1);
}

const sourceCache = new Map();
const readLines = (file) => {
	if (!sourceCache.has(file)) {
		sourceCache.set(
			file,
			fs.readFileSync(path.join(root, file), "utf8").split("\n"),
		);
	}
	return sourceCache.get(file);
};

for (const { file, line } of textHits.matches) {
	if (skipped(file)) continue;
	const lines = readLines(file);
	if (ignoredAt(lines, line)) {
		ignoredCount += 1;
		continue;
	}
	const text = (lines[line - 1] ?? "").trim();
	const verdict = file.startsWith("packages/") ? "SHIPPED" : "INLINE";
	problems.push({ verdict, file, line, text });
}

// --- literal attributes ----------------------------------------------------
// A regex rather than a GritQL node predicate: Biome's GritQL has no
// `jsx_attribute()`, and a pattern it does not understand matches every file
// rather than failing — which is the silent-pass this check exists to avoid.
// Comments are stripped first, because a docblock showing `aria-label="…"` as
// an EXAMPLE is the one false positive this would otherwise produce.
const ATTR = new RegExp(
	`\\b(${COPY_ATTRIBUTES.map((a) => a.replace("-", "\\-")).join("|")})\\s*=\\s*"([^"]+)"`,
	"g",
);

function stripComments(source) {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
		.replace(
			/(^|[^:])\/\/[^\n]*/g,
			(m, p1) => p1 + " ".repeat(m.length - p1.length),
		);
}

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(path.join(root, dir), {
		withFileTypes: true,
	})) {
		const rel = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
			walk(rel, out);
		} else if (/\.tsx?$/.test(entry.name)) {
			out.push(rel);
		}
	}
	return out;
}

const sourceFiles = [
	...walk("apps/web/src"),
	...walk("packages/core/src"),
	...walk("packages/design/src"),
];

for (const file of sourceFiles) {
	if (skipped(file)) continue;
	const raw = fs.readFileSync(path.join(root, file), "utf8");
	const lines = raw.split("\n");
	const clean = stripComments(raw).split("\n");

	clean.forEach((lineText, i) => {
		for (const m of lineText.matchAll(ATTR)) {
			const lineNumber = i + 1;
			if (ignoredAt(lines, lineNumber)) {
				ignoredCount += 1;
				continue;
			}
			problems.push({
				verdict: file.startsWith("packages/") ? "SHIPPED" : "INLINE",
				file,
				line: lineNumber,
				text: `${m[1]}="${m[2]}"`,
			});
		}
	});
}

// --- DORMANT ---------------------------------------------------------------
// A primitive that ships copy is upstream's business until the app reaches for
// it. `ui/<name>/` that is a bare re-export has no injection point, so the
// first import is the moment the words go on screen unwrapped.
const primitiveDir = "packages/design/src/ui/primitive";
const primitiveHits = search(PROSE, [primitiveDir]);
const primitivesWithCopy = new Set(
	primitiveHits.matches.map((m) => path.basename(m.file, ".tsx")),
);

for (const name of [...primitivesWithCopy].sort()) {
	const wrapper = path.join(root, `packages/design/src/ui/${name}/index.ts`);
	if (!fs.existsSync(wrapper)) continue;

	const wrapsIt = fs
		.readdirSync(path.join(root, `packages/design/src/ui/${name}`))
		.some((f) => f !== "index.ts");

	if (wrapsIt) continue;

	const used = sourceFiles.some(
		(file) =>
			!file.startsWith(primitiveDir) &&
			fs.readFileSync(path.join(root, file), "utf8").includes(`ui/${name}"`),
	);

	const entry = {
		verdict: "DORMANT",
		file: `packages/design/src/ui/${name}`,
		line: 0,
		text: `ships copy, and ui/${name}/ is a bare re-export`,
	};
	if (used) problems.push({ ...entry, verdict: "SHIPPED" });
	else warnings.push(entry);
}

// --- UNSEAMED / KEYLESS ----------------------------------------------------
const pagesDir = path.join(root, "apps/web/src/pages");
for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const content = path.join(pagesDir, entry.name, `${entry.name}.content.ts`);
	if (!fs.existsSync(content)) {
		problems.push({
			verdict: "UNSEAMED",
			file: `apps/web/src/pages/${entry.name}`,
			line: 0,
			text: `no ${entry.name}.content.ts`,
		});
	}
}

const contentModules = sourceFiles.filter((f) => f.endsWith(".content.ts"));
for (const file of contentModules) {
	const source = fs.readFileSync(path.join(root, file), "utf8");
	if (!/\bkey:\s*["'`]/.test(source)) {
		problems.push({
			verdict: "KEYLESS",
			file,
			line: 0,
			text: "not a dictionary — intlayer skips it",
		});
	}
}

// --- report ----------------------------------------------------------------
const WIDTH = 9;
for (const w of warnings) {
	console.warn(`${w.verdict.padEnd(WIDTH)} ${w.file}  ${w.text}`);
}

if (problems.length > 0) {
	problems.sort(
		(a, b) =>
			a.verdict.localeCompare(b.verdict) || a.file.localeCompare(b.file),
	);
	for (const p of problems) {
		const where = p.line > 0 ? `${p.file}:${p.line}` : p.file;
		console.error(`${p.verdict.padEnd(WIDTH)} ${where}  ${p.text}`);
	}
	console.error(
		`\n${problems.length} problem(s). See docs/ux/copy.md for what each verdict means.`,
	);
	process.exit(1);
}

const ignoredNote = ignoredCount > 0 ? `, ${ignoredCount} ignored` : "";
const warnNote = warnings.length > 0 ? `, ${warnings.length} dormant` : "";
console.log(
	`Copy: ${contentModules.length} dictionaries, no inline strings${warnNote}${ignoredNote}.`,
);
