#!/usr/bin/env node
/**
 * `pnpm new:screen <name>` — a screen that already follows the conventions.
 *
 * The page triad is mechanical: a `.page.tsx` that renders, a `.content.ts`
 * that says, pure `.ts` siblings that decide, a spec with five fixed headings,
 * and a scenario placeholder. Every part of that is easy to describe and easy
 * to forget, and this template shipped proof — its own `home` screen went in
 * without a content module or a spec, under a docblock that described both.
 *
 * So the conventions stop being something a consumer must remember and become
 * something they receive. That is the whole argument for this file.
 *
 * What it does NOT do is add a route. Routing is file-based, so a route is a
 * real decision — which layout group, which guard, which loader — and a
 * generated one would be wrong often enough to be worse than absent. It would
 * also drag `routeTree.gen.ts` drift into a scaffold. Add the route by hand;
 * `docs/routing.md` is four paragraphs.
 *
 *   node scripts/new-screen.mjs reports
 *   node scripts/new-screen.mjs reports --dry    # show the files, write none
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const PAGES_DIR = path.join(repoRoot, "apps/web/src/pages");
const SPEC_DIR = path.join(repoRoot, "apps/web/docs/screens");
const PENDING = path.join(PAGES_DIR, "pending-screens.scenario.test.ts");

/**
 * kebab-case only, and the check is not pedantry.
 *
 * Every generated filename embeds the name — `reports.page.tsx`,
 * `reports.content.ts`, `reports.md` — and the repo's rule is kebab-case
 * throughout. A capital or a space here produces files that break the
 * convention on the first commit, which is the opposite of the point.
 */
const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function usage(message) {
	if (message) console.error(`${message}\n`);
	console.error("usage: node scripts/new-screen.mjs <screen-name> [--dry]");
	console.error("       names are kebab-case: reports, item-detail");
	process.exit(1);
}

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const name = argv.find((a) => !a.startsWith("--"));

if (!name) usage();
if (!NAME.test(name)) usage(`"${name}" is not kebab-case.`);

const pageDir = path.join(PAGES_DIR, name);
const specFile = path.join(SPEC_DIR, `${name}.md`);

// Refuse rather than merge. Same posture as `pnpm ui:remove`, which refuses
// while a component still has consumers: a scaffold that overwrites is a
// scaffold nobody can run twice without checking git first.
if (fs.existsSync(pageDir))
	usage(`apps/web/src/pages/${name}/ already exists.`);
if (fs.existsSync(specFile)) usage(`apps/web/docs/screens/${name}.md exists.`);

/** `item-detail` -> `ItemDetail` */
const pascal = name
	.split("-")
	.map((part) => part[0].toUpperCase() + part.slice(1))
	.join("");
/** `item-detail` -> `itemDetail` */
const camel = pascal[0].toLowerCase() + pascal.slice(1);
/** `item-detail` -> `Item detail` */
const title = name
	.split("-")
	.join(" ")
	.replace(/^./, (c) => c.toUpperCase());

// The one scenario the scaffold invents. It appears in BOTH the spec and the
// pending test with the same sentence, so `pnpm scenario:check` is green from
// the first commit and the author edits the pair together — which is the loop
// the template is teaching.
const FIRST_SCENARIO = "the screen states what it is for";

const files = new Map();

files.set(
	path.join(pageDir, `${name}.content.ts`),
	`/**
 * Everything this screen says.
 *
 * Every user-facing string, in one typed object. Not a nicety — it is the i18n
 * seam (docs/i18n.md) and the thing that makes copy reviewable without reading
 * JSX. See docs/ux/copy.md for the voice rules.
 */
export const ${camel}Content = {
	title: "${title}",
	description: "TODO: what this screen is for, in one line.",
} as const;

export type ${pascal}Content = typeof ${camel}Content;
`,
);

files.set(
	path.join(pageDir, `${name}.page.tsx`),
	`import { PageHeader } from "@/shared/ui/page-header";

import { ${camel}Content } from "./${name}.content";

/**
 * A page renders. It does not decide.
 *
 * Anything this screen decides goes in a pure \`.ts\` sibling — a scenario test
 * never renders, so a rule written inside a handler here is a rule nothing can
 * assert. See docs/page-triad.md.
 */
export function ${pascal}Page() {
	return (
		<div className="flex flex-col">
			<PageHeader
				title={${camel}Content.title}
				description={${camel}Content.description}
			/>
		</div>
	);
}
`,
);

files.set(
	path.join(pageDir, "index.ts"),
	`export { ${camel}Content } from "./${name}.content";
export { ${pascal}Page } from "./${name}.page";
`,
);

files.set(
	specFile,
	`# ${title}

## Purpose

TODO: what this screen is for, in a sentence or two. If you cannot write it
without "and", it is probably two screens.

## States

| State | What it shows |
| --- | --- |
| Loading | TODO — a skeleton whose layout mirrors the real content. |
| Empty, nothing yet | TODO — and the action that creates the first one. |
| Empty, nothing matches | TODO — different wording, different action. |
| Error | TODO — with a retry. |

## Scenarios

S1. TODO: ${FIRST_SCENARIO}.

One outcome per scenario, stated as a fact. Every \`S<n>\` here needs a test
naming it, and \`pnpm scenario:check\` fails the build if one does not — in
either direction.

## Data

TODO: where it comes from, and what is still mocked.

## Not covered

TODO: what the scenarios deliberately do not assert, and why. This section is
the one reviewers read; an empty one means nobody decided what was out of
scope.
`,
);

const pendingBlock = `
// Spec: ../../docs/screens/${name}.md
describe("${name} (not built)", () => {
	it.todo("S1: TODO: ${FIRST_SCENARIO}");
});
`;

console.log(`${dry ? "dry run — nothing written\n" : ""}`);
for (const [file, body] of files) {
	console.log(
		`  ${dry ? "would create" : "create"} ${path.relative(repoRoot, file)}`,
	);
	if (dry) continue;
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, body);
}

console.log(
	`  ${dry ? "would append to" : "append to"} ${path.relative(repoRoot, PENDING)}`,
);
if (!dry) fs.appendFileSync(PENDING, pendingBlock);

console.log(`
Next:
  1. Write the spec. The scenarios are the screen — everything else follows.
  2. Add a route in apps/web/src/routes/ that renders <${pascal}Page />.
     Deliberately not generated: which layout group and which guard is a real
     decision. See docs/routing.md.
  3. Replace the S1 placeholder in the spec AND in
     pending-screens.scenario.test.ts together; pnpm scenario:check holds the
     two to each other.
  4. When the screen is built, move its describe block into
     pages/${name}/${name}.scenario.test.ts and keep the numbers.
`);
