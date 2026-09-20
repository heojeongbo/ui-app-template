/// <reference types="vitest/config" />

import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// No bundle: consumers compile this package from source. The config exists so
// Vitest can render JSX and resolve the package's own public specifier.
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@template/core": path.resolve(dirname, "./src"),
			"@template/design": path.resolve(dirname, "../design/src"),
		},
		dedupe: ["react", "react-dom"],
	},
	test: {
		environment: "happy-dom",
		include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
	},
}) satisfies UserConfig;
