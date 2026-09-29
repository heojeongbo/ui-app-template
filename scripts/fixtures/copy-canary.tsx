// The engine self-test for scripts/check-copy.mjs — not shipped, not imported.
//
// It must contain EXACTLY one prose JSX text node and EXACTLY one allowlisted
// string-literal attribute. `check-copy.mjs` asserts it finds them before it
// trusts a single empty result from anywhere else: `biome search` is
// experimental, and a GritQL change would otherwise leave every query matching
// nothing while the build stayed green.
export function Canary() {
	return (
		<button type="button" aria-label="canary label">
			canary prose
		</button>
	);
}
