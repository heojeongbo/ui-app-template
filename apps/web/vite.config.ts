/// <reference types="vitest/config" />

import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type UserConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = (name: string) =>
	path.resolve(dirname, `../../packages/${name}/src`);

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, dirname, "");

	// Vitest loads this config too. The router plugin's code splitter rewrites
	// each route into a critical half plus lazily-imported halves, and those
	// virtual modules do not resolve under the test runner — it fails with
	// "Cannot set properties of undefined (setting 'tsr-split-component:component')".
	// Splitting is a build concern; tests have no use for it.
	const isTest = !!process.env["VITEST"];

	return {
		plugins: [
			// BEFORE react(). The router plugin rewrites route files to split
			// their non-critical parts out; react() would otherwise transform the
			// JSX first and leave nothing for it to recognise.
			tanstackRouter({
				// Route-level chunks for free. Only works on `createFileRoute`
				// declarations — a code-based `createRoute()` tree is never split,
				// which is the reason this app is file-based. Off under Vitest;
				// see `isTest` above.
				autoCodeSplitting: !isTest,
				// Keeps a colocated `*.content.ts` from being mistaken for a route.
				// Cheap insurance: routes/ holds only routes today, and the day
				// someone colocates copy there this is what stops a 404.
				routeFileIgnorePattern: ".*.content.tsx?",
			}),
			react(),
			tailwindcss(),
		],

		server: {
			// Same-origin `/api` so the session cookie flows without CORS. The
			// transport's default baseUrl matches, so nothing has to be configured
			// twice.
			// Bracket access: `loadEnv` returns a plain `Record<string, string>`,
			// so every key here is permitted rather than declared — and a typo
			// would read `undefined` and silently drop the proxy.
			proxy: env["VITE_API_PROXY_TARGET"]
				? {
						"/api": {
							target: env["VITE_API_PROXY_TARGET"],
							changeOrigin: true,
							ws: true,
							cookieDomainRewrite: "",
						},
					}
				: undefined,
		},

		resolve: {
			// Mirrored in tsconfig.json `paths`. Both must agree — a mismatch
			// resolves in Vite and fails in tsc, so the dev server stays green
			// while CI goes red.
			// ORDER MATTERS. Vite matches a string alias by prefix, so a bare
			// "@" also matches "@template/core" — listed first it would rewrite
			// the workspace specifiers into `src/template/core`. Most specific
			// first, catch-all last.
			alias: {
				"@template/core": pkg("core"),
				"@template/design": pkg("design"),
				"@template/interfaces": pkg("interfaces"),
				"@": path.resolve(dirname, "./src"),
			},
			// Mandatory with linked workspace packages: two copies of React make
			// every hook-dispatcher check and `instanceof` fail in ways that read
			// as random.
			dedupe: ["react", "react-dom"],
		},

		test: {
			environment: "happy-dom",
			include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
		},
	} satisfies UserConfig;
});
