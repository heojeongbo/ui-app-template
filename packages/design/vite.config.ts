/// <reference types="vitest/config" />

import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// This package ships no bundle — it is compiled from source by its consumers.
// The config exists so Vitest can render JSX and resolve the package's own
// public specifier the same way an app does.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@template/design": path.resolve(dirname, "./src"),
		},
		// Mandatory in a linked workspace: two React copies make every `instanceof`
		// and every hook-dispatcher check fail in ways that read as random.
		dedupe: ["react", "react-dom"],
	},
	test: {
		environment: "happy-dom",
		include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
	},
}) satisfies UserConfig;
