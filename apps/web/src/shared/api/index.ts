/**
 * `getTransport` and `resetClients` are deliberately NOT exported. Both exist
 * for this directory's own wiring and have no callers outside it; in a barrel
 * that survives the demo deletion they would be two permanent symbols a
 * consumer has to triage.
 */
export { getClient } from "./client";
export type { TransportConfig } from "./transport";
export { configureTransport } from "./transport";
