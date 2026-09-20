import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

/**
 * FSD layer boundaries, actually enforced.
 *
 * Biome has no import-boundary rule, so without this the layer direction and
 * the barrel-only rule are enforced by prose and review — which is to say, not
 * enforced. Steiger is a standalone CLI, so it coexists with a Biome-only
 * setup and costs nothing but a dev dependency.
 *
 * It runs on `pre-push` and in CI. It found two real violations the first time
 * it ran (`entities` and `shared` importing from `app`), and both were fixed
 * by moving the code rather than by silencing the rule — which is the standard
 * the two exceptions below are held to.
 *
 * NOTE: this file is `.js`, not `.ts`, on purpose. Steiger loads its config
 * through cosmiconfig, whose TypeScript loader calls `typescript.findConfigFile`
 * — an API TypeScript 7 no longer exposes the same way, so a `.ts` config dies
 * with "typescript.findConfigFile is not a function". JSDoc gives the same
 * editor support with none of that.
 */
export default defineConfig([
	...fsd.configs.recommended,

	{
		files: ["./apps/web/src/**"],
		rules: {
			/**
			 * OFF — conflicts with the page triad, deliberately.
			 *
			 * Steiger wants `pages/items/ui/`, `pages/items/model/`. This template
			 * keeps a screen flat: `items.page.tsx`, `items.content.ts`,
			 * `items.filters.ts`, `items.scenario.test.ts`. The dot-prefix already
			 * says what each file is, the folder listing reads as one screen
			 * rather than four folders holding one file each, and the scenario
			 * test sits beside the module it tests.
			 *
			 * A slice that genuinely outgrows a screen's worth of code should be
			 * split into segments — but by then it is usually a feature, not a
			 * page. See docs/page-triad.md.
			 */
			"fsd/no-segmentless-slices": "off",

			/**
			 * OFF — one name, and it is the conventional one.
			 *
			 * Steiger reads `app/providers` as naming what the contents ARE rather
			 * than what they are FOR. Fair as a general rule, but "providers" is
			 * what React developers already call this directory, and renaming it
			 * to something more purposeful would make the app harder to navigate
			 * for the sake of a lint.
			 */
			"fsd/segments-by-purpose": "off",
		},
	},
]);
