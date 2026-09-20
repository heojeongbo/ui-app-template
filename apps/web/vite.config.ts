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

	return {
		plugins: [
			// BEFORE react(). The router plugin rewrites route files to split
			// their non-critical parts out; react() would otherwise transform the
			// JSX first and leave nothing for it to recognise.
			tanstackRouter({
				// Route-level chunks for free. Only works on `createFileRoute`
				// declarations — a code-based `createRoute()` tree is never split,
				// which is the reason this app is file-based.
				autoCodeSplitting: true,
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
			proxy: env.VITE_API_PROXY_TARGET
				? {
						"/api": {
							target: env.VITE_API_PROXY_TARGET,
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
			alias: {
				"@": path.resolve(dirname, "./src"),
				"@template/core": pkg("core"),
				"@template/design": pkg("design"),
				"@template/interfaces": pkg("interfaces"),
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
