#!/bin/sh
# Rewrite the runtime config from the environment, at container start.
#
# This is the half that makes one image deployable to every environment:
# `VITE_*` is inlined at build time and cannot be changed afterwards, so
# anything that differs per deployment is read from `window.__APP_CONFIG__`
# instead. See docs/env-and-runtime-config.md.
#
# nginx runs everything in /docker-entrypoint.d before starting, so this needs
# no CMD of its own.
set -eu

CONFIG_FILE="${APP_CONFIG_FILE:-/usr/share/nginx/html/config.js}"

# Only emit keys that are actually set. A key present-but-empty would override
# the build-time default with an empty string, which is worse than absent —
# `readRuntimeConfig` treats absent as "fall back" and empty as a value.
#
# Explicit `if` rather than `[ -n "$X" ] && printf …`: under `set -e` the exit
# status of a failing `&&` list is shell-dependent, and the failure mode is a
# container that exits during startup with no output. Two extra lines buys
# certainty across ash, dash and bash.
emit() {
	printf 'window.__APP_CONFIG__ = {'

	if [ -n "${APP_API_BASE_URL:-}" ]; then
		printf '"apiBaseUrl":"%s",' "$APP_API_BASE_URL"
	fi

	if [ -n "${APP_LOG_LEVEL:-}" ]; then
		printf '"logLevel":"%s",' "$APP_LOG_LEVEL"
	fi

	# A whole palette, as JSON, for a tenant-branded deployment:
	#   APP_THEME='{"light":{"primary":"oklch(0.55 0.22 260)"},"dark":{...}}'
	# Passed through verbatim — `injectThemeTokens` validates the keys and logs
	# the ones it does not recognise, which is a better error than anything this
	# shell could produce.
	if [ -n "${APP_THEME:-}" ]; then
		printf '"theme":%s,' "$APP_THEME"
	fi

	printf '};\n'
}

emit > "$CONFIG_FILE"

echo "app-config: wrote $CONFIG_FILE"
