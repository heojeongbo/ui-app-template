// Runtime configuration. Overwritten at container start; the committed version
// is empty so a local dev build falls back to the .env values.
//
// Keys are validated by `readRuntimeConfig()` — a malformed file is ignored
// with a warning rather than crashing the app, because this gets hand-edited
// during a deploy.
window.__APP_CONFIG__ = {};
