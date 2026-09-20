import { create } from "zustand";

export type ConfirmOptions = {
	title: string;
	body: string;
	/** The affirmative button. Name the ACTION — "Delete", not "OK". */
	confirmLabel: string;
	cancelLabel: string;
	/** Renders the affirmative button as destructive. */
	destructive?: boolean;
	/**
	 * Require an explicit acknowledgement checkbox before the action unlocks.
	 *
	 * Reserve this for the irreversible: it costs the user a deliberate second
	 * action, and putting it on ordinary confirmations trains people to tick it
	 * without reading — which removes the protection from the cases that needed
	 * it.
	 */
	acknowledge?: string;
};

type ConfirmState = {
	open: boolean;
	options: ConfirmOptions | null;
	resolve: ((ok: boolean) => void) | null;
	request: (options: ConfirmOptions) => Promise<boolean>;
	settle: (ok: boolean) => void;
};

/**
 * A promise-based `confirm()`.
 *
 * The call site reads as a guard clause, which is the entire point:
 *
 *     if (!(await confirm({ … }))) return;
 *     await deleteItem();
 *
 * The alternative — a `<Dialog open={…}>` plus an `onConfirm` callback plus a
 * piece of "which row is pending" state — scatters one decision across three
 * places in the component and gets copied, subtly differently, into every
 * screen that needs it.
 *
 * Deliberately not `overlay-kit` or another modal library: this is sixty lines,
 * and a dependency whose only job is to turn a callback into a promise is one
 * more thing to keep on a supported version.
 *
 * Plain `create` rather than the app store factory: this holds an unresolved
 * promise, which must never be persisted or serialised into devtools.
 */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
	open: false,
	options: null,
	resolve: null,

	request: (options) =>
		new Promise<boolean>((resolve) => {
			// A second request while one is open would strand the first promise
			// forever. Resolve it as cancelled rather than leaking it.
			get().resolve?.(false);
			set({ open: true, options, resolve });
		}),

	settle: (ok) => {
		get().resolve?.(ok);
		// `options` is kept so the dialog's closing animation does not play
		// against empty text. It is replaced on the next request.
		set({ open: false, resolve: null });
	},
}));

/**
 * Ask outside React — from an event handler, a mutation, anywhere.
 *
 * `useConfirmStore.getState()` is zustand's sanctioned escape hatch, and it is
 * what lets this be a plain async function instead of a hook that every caller
 * has to thread through props.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
	return useConfirmStore.getState().request(options);
}
