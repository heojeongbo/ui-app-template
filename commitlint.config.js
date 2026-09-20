/**
 * Conventional Commits, enforced by the `commit-msg` hook.
 *
 * `scope-enum` is deliberately open: the workspace grows packages, and a
 * closed list becomes a second place to update on every addition.
 */
export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// The default 72 truncates messages that name the failure they fix, which
		// is exactly the commit body this repo asks for.
		"body-max-line-length": [1, "always", 100],
	},
};
