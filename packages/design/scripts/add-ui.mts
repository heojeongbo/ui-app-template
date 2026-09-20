/**
 * `pnpm ui:add <component>...` — install a shadcn component into this package.
 *
 * Five steps, because `shadcn add` only does the first. It drops a file into
 * `src/ui/primitive/` in its own formatting and knows nothing about our public
 * surface; the rest of this script is what makes the result importable as
 * `@template/design/ui` and consistent with the workspace (tabs, double quotes,
 * sorted imports).
 *
 *   1. install            -> src/ui/primitive/<name>.tsx   (CLI-owned)
 *   2. normalise imports  -> point `cn` at our own module
 *   3. scaffold a wrapper -> src/ui/<name>/index.ts        (ours)
 *   4. refresh the barrel -> src/ui/index.ts
 *   5. format
 *
 * Step 2 is what keeps "everything goes through our layer" from costing
 * boilerplate. The wrapper starts as a one-line re-export; to customise the
 * component later, add `src/ui/<name>/<name>.tsx` and point the index at it
 * instead. Call sites never change.
 *
 * The CLI is resolved with `pnpm dlx` rather than pinned as a devDependency so
 * a new component always comes from the current registry.
 *
 * AFTER RUNNING: check the bottom of `src/style/style.css`. A component that
 * ships `cssVars` gets its palette appended there in HSL, after the imports,
 * overriding our oklch tokens. Delete the injected block.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(dirname, "..");
const uiDir = path.join(pkgDir, "src", "ui");

const argv = process.argv.slice(2);
// Flags are forwarded to the CLI but must not be mistaken for component names,
// or `--yes` would get a wrapper folder scaffolded for it.
const flags = argv.filter((a) => a.startsWith("-"));
const components = argv.filter((a) => !a.startsWith("-"));

if (components.length === 0) {
	console.error("usage: pnpm ui:add [--flags] <component>...");
	process.exit(1);
}

function run(command: string, args: string[]): void {
	const { status } = spawnSync(command, args, {
		cwd: pkgDir,
		stdio: "inherit",
	});
	if (status !== 0) process.exit(status ?? 1);
}

/**
 * As of CLI 4.x, generated components import `cn` from the standalone `cn`
 * package rather than from the `utils` alias in components.json (that alias is
 * still in the schema, but the emitted code ignores it).
 *
 * We point them back at `lib/utils` so there is exactly ONE import path for
 * class merging across both layers — primitives and our own components. Two
 * spellings of the same function is the kind of inconsistency that makes a
 * later swap (or a bug in one of them) a search-and-replace instead of an edit.
 *
 * Idempotent, and safe to re-run over the whole directory: a file that already
 * points at `lib/utils` matches nothing.
 */
function normalisePrimitiveImports(): void {
	const primitiveDir = path.join(uiDir, "primitive");
	if (!fs.existsSync(primitiveDir)) return;

	const CN_IMPORT = /(\bfrom\s+)["']cn["']/g;
	const OURS = '$1"@template/design/lib/utils"';

	for (const entry of fs.readdirSync(primitiveDir)) {
		if (!/\.tsx?$/.test(entry)) continue;
		const file = path.join(primitiveDir, entry);
		const before = fs.readFileSync(file, "utf8");
		const after = before.replace(CN_IMPORT, OURS);
		if (after !== before) {
			fs.writeFileSync(file, after);
			console.log(`normalised cn import: primitive/${entry}`);
		}
	}
}

// `--overwrite` by default, and it is the two-layer split that makes it safe:
// `primitive/` is CLI-owned and never hand-edited, so re-writing it loses
// nothing. Without it the CLI PROMPTS whenever a component pulls in one that
// already exists (`alert-dialog` needs `button`), and under `--yes` that prompt
// makes the whole install bail silently — the requested component never lands.
// Pass `--no-overwrite` to opt out.
const overwrite = flags.includes("--no-overwrite")
	? flags.filter((f) => f !== "--no-overwrite")
	: [...flags, "--overwrite"];

run("pnpm", ["dlx", "shadcn@latest", "add", ...overwrite, ...components]);

normalisePrimitiveImports();

for (const name of components) {
	// Trust what landed on disk, not the requested name: shadcn resolves aliases
	// and installs a component's dependencies too, and a name that produced no
	// file must not get a wrapper pointing at nothing.
	if (!fs.existsSync(path.join(uiDir, "primitive", `${name}.tsx`))) {
		console.warn(`skip wrapper: primitive/${name}.tsx was not installed`);
		continue;
	}

	const wrapperDir = path.join(uiDir, name);
	if (fs.existsSync(wrapperDir)) {
		console.log(`wrapper exists, left alone: ui/${name}/`);
		continue;
	}

	fs.mkdirSync(wrapperDir, { recursive: true });
	fs.writeFileSync(
		path.join(wrapperDir, "index.ts"),
		`export * from "../primitive/${name}";\n`,
	);
	console.log(`wrapper created: ui/${name}/index.ts`);
}

run("pnpm", ["exec", "tsx", path.join(dirname, "sync-ui-barrel.mts")]);
run("pnpm", ["exec", "biome", "check", "--write", "src"]);
