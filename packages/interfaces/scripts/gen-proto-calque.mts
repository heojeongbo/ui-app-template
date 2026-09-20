/**
 * `pnpm gen:proto:calque` — the OPT-IN Tier 2 codegen.
 *
 * Tier 1 (`pnpm gen:proto`) is protoc-gen-es + connect-es and needs nothing
 * but node. This tier adds calque, which generates a Dexie-backed offline
 * store and a normalised client from `orm`-annotated schemas — and which is a
 * **Go program**, not an npm package (`npm view @heojeongbo/calque` is a 404).
 * That Go dependency is the whole reason this is separate and optional.
 *
 * Two passes, and the split is not cosmetic:
 *
 *   1. `service` reads the `rpc: {crud, list}` annotations and emits
 *      `<entity>_svc.g.proto` — the RPC surface they imply — next to the
 *      entity, so it joins the module.
 *   2. `ts` reads entity + service and emits the client, the Dexie tables and
 *      the schema map.
 *
 * Running pass 2 alone succeeds and produces an EMPTY `ServiceClient` and an
 * empty `queries` table: valid TypeScript that does nothing. There is no error
 * because, from calque's point of view, a schema with no service simply has no
 * RPCs. Hence one script that always runs both.
 *
 * Delete `calque/` and this script to drop the tier entirely; nothing on the
 * default path imports from `src/gen-calque`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(dirname, "..");
const calqueDir = path.join(pkgDir, "calque");
const outDir = path.join(pkgDir, "src", "gen-calque");

function requireGo(): void {
	const { status } = spawnSync("go", ["version"], { stdio: "ignore" });
	if (status === 0) return;

	console.error(
		[
			"gen:proto:calque needs Go on PATH — calque's generator is a Go program.",
			"",
			"  Install Go >= 1.26.3, or skip this tier: `pnpm gen:proto` covers the",
			"  default protobuf path and needs nothing but node.",
		].join("\n"),
	);
	process.exit(1);
}

function run(args: string[]): void {
	const { status, error } = spawnSync("pnpm", args, {
		cwd: calqueDir,
		stdio: "inherit",
	});
	if (error) {
		console.error(`failed to run pnpm ${args.join(" ")}: ${error.message}`);
		process.exit(1);
	}
	if (status !== 0) process.exit(status ?? 1);
}

requireGo();

run(["exec", "buf", "lint"]);

// Pass 1 writes into the schema module, so clear the previous result first:
// an entity removed from the schema would otherwise keep its service proto,
// and pass 2 would keep generating a client for something that no longer
// exists.
for (const file of fs.globSync("proto/schema/**/*_svc.g.proto", {
	cwd: calqueDir,
})) {
	fs.rmSync(path.join(calqueDir, file));
}
run(["exec", "buf", "generate", "--template", "buf.gen.service.yaml"]);

fs.rmSync(outDir, { recursive: true, force: true });
run(["exec", "buf", "generate", "--template", "buf.gen.ts.yaml"]);

const produced = fs.existsSync(outDir) ? fs.readdirSync(outDir).length : 0;
if (produced === 0) {
	console.error(
		"gen:proto:calque produced no output. Check calque/buf.gen.ts.yaml.",
	);
	process.exit(1);
}

console.log("gen:proto:calque wrote src/gen-calque");
