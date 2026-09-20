/**
 * The package's own barrel is deliberately thin.
 *
 * Consumers import the slice they need — `@template/core/logger`,
 * `@template/core/query`, `@template/core/api` — so a page that wants the
 * logger does not pull the transport, zustand and react-query into its route
 * chunk. This file exists for the handful of things that are genuinely
 * cross-cutting.
 */
export type { LogLevel, LogScope } from "./logger";
export { createScopedLogger } from "./logger";
