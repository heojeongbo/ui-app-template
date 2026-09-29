// The star export stays, so a component upstream adds later still flows through
// this wrapper — "everything goes through the wrapper, including untouched
// components" (docs/design-system.md). The two explicit exports below shadow
// it: an explicit export always wins over a `export *`.
export * from "../primitive/dialog";
export { DialogContent, DialogFooter } from "./dialog";
