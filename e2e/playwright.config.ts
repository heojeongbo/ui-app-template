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

// Read once, through a bracket because `process.env` is an index signature.
// The five settings below all key off the same question, and naming it is what
// stops a typo'd `process.env.C1` from silently reading `undefined` — which
// would turn CI's retries and serial workers off with nothing to notice.
const isCI = !!process.env["CI"];

export default defineConfig({
	testDir: "./tests",

	// A failing assertion inside a `.only` left behind in a commit is the
	// classic way a suite silently stops covering anything.
	forbidOnly: isCI,

	// Retry in CI only. Locally a retry hides a flake you were about to fix;
	// in CI it stops one network blip from failing a merge.
	retries: isCI ? 2 : 0,

	// Serial in CI for reproducible timing, parallel locally for speed.
	workers: isCI ? 1 : undefined,

	reporter: isCI
		? [["github"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],

	use: {
		baseURL: `http://localhost:${PORT}`,

		// Pins what `navigator.languages` reports, so the app's own detection
		// resolves to en-US regardless of the machine running the suite. Without
		// it the specs' English assertions pass in CI and fail on a Korean
		// laptop, reading as a copy regression rather than as an unset default.
		locale: "en-US",

		// Asia/Seoul, NOT UTC, and that is the deliberate half.
		//
		// Unset, this inherits the machine's zone, so a developer in Seoul and CI
		// in UTC render different calendar days for the same fixture. Pinning UTC
		// would make the suite deterministic AND make the bug it is guarding
		// invisible, because `toISOString()` is correct in UTC. The fixtures are
		// EPOCH (2026-01-01T00:00:00Z) plus one hour per index, so rows 16–23 are
		// Jan 1 in UTC and Jan 2 in Seoul — which is the off-by-one the date cell
		// used to ship.
		timezoneId: "Asia/Seoul",
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
		reuseExistingServer: !isCI,
		timeout: 120_000,
		env: {
			// Without this the app talks to /api and every test fails on a
			// connection error that looks like a Playwright problem.
			VITE_ENABLE_MOCKS: "true",
		},
	},
});
