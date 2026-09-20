/**
 * `pnpm ui:remove <component>...` — take a shadcn component back out.
 *
 * The counterpart to `ui:add`, and it exists for one reason `rm -rf` cannot
 * cover: it **refuses to delete a component that is still imported**. Deleting
 * one by hand leaves the barrel regenerating cleanly and the failure surfacing
 * somewhere else entirely — a type error in an app, three packages away from
 * the thing you actually removed.
 *
 *   1. check for consumers  -> refuse if any (unless --force)
 *   2. delete ui/<name>/ and ui/primitive/<name>.tsx
 *   3. refresh the barrel
 *
 * It does NOT uninstall npm dependencies the component pulled in (a Radix
 * package, say). Those are shared, and working out whether another component
 * still needs one is guesswork — `pnpm why <pkg>` is the honest way to check.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(dirname, "..");
const uiDir = path.join(pkgDir, "src", "ui");
const repoRoot = path.resolve(pkgDir, "../..");

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const components = argv.filter((a) => !a.startsWith("-"));

if (components.length === 0) {
	console.error("usage: pnpm ui:remove [--force] <component>...");
	process.exit(1);
}

/**
 * Who still imports this?
 *
 * The name must be followed by a quote or a slash. A plain substring search
 * makes `alert` match `alert-dialog`, so removing an unused component is
 * refused because of an unrelated one that happens to share a prefix — which
 * is exactly what happened the first time this ran.
 *
 * The barrel is excluded: it is regenerated, so a reference from it is not a
 * consumer.
 */
function consumersOf(name: string): string[] {
	const { stdout, status } = spawnSync(
		"grep",
		[
			"-rlE",
			"--include=*.ts",
			"--include=*.tsx",
			"--exclude-dir=node_modules",
			"--exclude-dir=primitive",
			`design/ui/${name}("|'|/)`,
			"apps",
			"packages",
		],
		{ cwd: repoRoot, encoding: "utf8" },
	);

	// grep exits 1 when it matches nothing, which is the common case here.
	if (status !== 0 || !stdout.trim()) return [];

	return stdout
		.trim()
		.split("\n")
		.filter((file) => !file.endsWith("src/ui/index.ts"))
		.filter((file) => !file.includes(`src/ui/${name}/`));
}

let removed = 0;

for (const name of components) {
	const wrapperDir = path.join(uiDir, name);
	const primitive = path.join(uiDir, "primitive", `${name}.tsx`);

	if (!fs.existsSync(wrapperDir) && !fs.existsSync(primitive)) {
		console.warn(`not installed, skipping: ${name}`);
		continue;
	}

	const consumers = consumersOf(name);
	if (consumers.length > 0 && !force) {
		console.error(
			[
				`refusing to remove "${name}" — still imported by:`,
				...consumers.map((file) => `  ${file}`),
				"",
				"Remove those imports first, or pass --force and fix the fallout.",
			].join("\n"),
		);
		process.exitCode = 1;
		continue;
	}

	fs.rmSync(wrapperDir, { recursive: true, force: true });
	fs.rmSync(primitive, { force: true });
	console.log(`removed: ui/${name}/ and ui/primitive/${name}.tsx`);
	removed += 1;
}

if (removed > 0) {
	const { status } = spawnSync(
		"pnpm",
		["exec", "tsx", path.join(dirname, "sync-ui-barrel.mts")],
		{ cwd: pkgDir, stdio: "inherit" },
	);
	if (status !== 0) process.exit(status ?? 1);

	console.log(
		"\nNote: npm dependencies the component pulled in are left alone — they may be shared. `pnpm why <pkg>` to check.",
	);
}
