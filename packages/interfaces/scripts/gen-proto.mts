/**
 * `pnpm gen:proto` — regenerate TypeScript from `proto/`.
 *
 * Three steps: lint the schema, generate, format. Linting first means a naming
 * mistake is reported against the `.proto` line that caused it, rather than
 * surfacing later as a strangely-named export.
 *
 * The generated tree under `src/gen/` IS committed. That is a deliberate
 * trade: the repo carries some derived code, and in exchange a fresh clone can
 * `pnpm install && pnpm dev` with no Go, no buf, and no network. CI runs this
 * script and then `git diff --exit-code` to catch a stale tree.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(dirname, "..");
const outDir = path.join(pkgDir, "src", "gen");

function run(command: string, args: string[]): void {
	const { status, error } = spawnSync(command, args, {
		cwd: pkgDir,
		stdio: "inherit",
	});
	if (error) {
		console.error(`failed to run ${command}: ${error.message}`);
		process.exit(1);
	}
	if (status !== 0) process.exit(status ?? 1);
}

run("pnpm", ["exec", "buf", "lint"]);

// Wipe first. buf only writes the files a schema currently produces, so a
// message deleted from a .proto leaves its generated file behind forever —
// still importable, still type-checking, and silently wrong.
fs.rmSync(outDir, { recursive: true, force: true });

run("pnpm", ["exec", "buf", "generate"]);

// The generated tree is excluded from Biome's linter and formatter (see the
// root biome.jsonc override), so this is only here to fail loudly if buf
// produced nothing at all — an empty out dir otherwise looks like success.
const produced = fs.existsSync(outDir) ? fs.readdirSync(outDir).length : 0;
if (produced === 0) {
	console.error(
		"gen:proto produced no output. Check buf.gen.yaml's `inputs` and that protoc-gen-es is installed at the workspace root.",
	);
	process.exit(1);
}

console.log(
	`gen:proto wrote ${produced} top-level entr${produced === 1 ? "y" : "ies"} to src/gen`,
);
