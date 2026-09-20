/**
 * End-to-end suite.
 *
 * ## Running it
 *
 *   pnpm -C e2e install-browsers   # once, per machine
 *   pnpm e2e                       # builds the app and drives it
 *   pnpm -C e2e test:ui            # pick through failures interactively
 *   pnpm -C e2e report             # open the last HTML report
 *
 * The runbook lives here, in the config, rather than in a wiki page: this is
 * the file someone opens when the suite will not start.
 *
 * ## What it runs against
 *
 * A PRODUCTION build with mocks enabled, not the dev server. Two reasons: the
 * dev server's transform pipeline is not what ships, and a suite that waits on
 * HMR is a suite that flakes. `VITE_ENABLE_MOCKS` makes the app answer its own
 * RPCs, so the suite needs no backend and is deterministic — the fixtures are
 * hash-generated, so row 3 is the same row on every run and on every machine.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
	testDir: "./tests",

	// A failing assertion inside a `.only` left behind in a commit is the
	// classic way a suite silently stops covering anything.
	forbidOnly: !!process.env.CI,

	// Retry in CI only. Locally a retry hides a flake you were about to fix;
	// in CI it stops one network blip from failing a merge.
	retries: process.env.CI ? 2 : 0,

	// Serial in CI for reproducible timing, parallel locally for speed.
	workers: process.env.CI ? 1 : undefined,

	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],

	use: {
		baseURL: `http://localhost:${PORT}`,
		// On the first retry, not every run: traces are large, and the one that
		// matters is the run that failed.
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},

	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

	webServer: {
		// `vite preview` serves the real build output.
		command: `pnpm -C ../apps/web build && pnpm -C ../apps/web preview --port ${PORT}`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			// Without this the app talks to /api and every test fails on a
			// connection error that looks like a Playwright problem.
			VITE_ENABLE_MOCKS: "true",
		},
	},
});
