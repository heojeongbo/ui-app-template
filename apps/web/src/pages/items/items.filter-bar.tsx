import { Input } from "@template/design/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@template/design/ui/select";
import { useId } from "react";
import { useIntlayer } from "react-intlayer";

import { STATUS_FILTERS, type StatusFilter } from "@/entities/item";
import { useFormatters } from "@/shared/lib/format";
import {
	PAGE_SIZE_OPTIONS,
	type PageSize,
	toPageSize,
} from "@/shared/lib/search";

import type { ItemsSearch } from "./items.filters";

type Props = {
	search: ItemsSearch;
	onStatusChange: (status: StatusFilter) => void;
	onQueryChange: (value: string) => void;
	onPageSizeChange: (size: PageSize) => void;
};

/**
 * The filter controls.
 *
 * Every handler here is a one-line call into `items.filters.ts`. That is not
 * ceremony: the moment one of them grows a `?:` it becomes a decision a
 * scenario test cannot reach, and the fix is always to move it out rather than
 * to test through the DOM.
 *
 * The text input is uncontrolled-by-URL on purpose — it uses `defaultValue`
 * and commits on Enter/blur. Writing every keystroke into the URL means a
 * history entry per character and a request per character.
 */
export function ItemsFilterBar({
	search,
	onStatusChange,
	onQueryChange,
	onPageSizeChange,
}: Props) {
	const c = useIntlayer("items");
	const f = useFormatters();
	const searchId = useId();
	const statusId = useId();
	const sizeId = useId();

	// Re-stated where the compiler sees the GENERATED type. `STATUS_FILTERS` is
	// what the loop below iterates, so a filter added there without a label
	// fails here rather than rendering an empty option.
	const statusOptions = c.statusOptions satisfies Record<StatusFilter, unknown>;

	return (
		<div className="flex flex-wrap items-end gap-3">
			<div className="flex min-w-48 flex-1 flex-col gap-1.5">
				{/*
					The same leaf in both of its shapes, three lines apart: rendered as
					content here, and as a raw string on `placeholder` below. That
					split is the whole point of the shape table in docs/ux/copy.md —
					a dictionary node renders, but a string prop needs `.value`.
				*/}
				<label htmlFor={searchId} className="font-medium text-sm">
					{c.searchPlaceholder}
				</label>
				<Input
					id={searchId}
					type="search"
					// `key` forces a remount when the URL query changes from elsewhere
					// — "clear filters" has to visibly empty the box, and an
					// uncontrolled input ignores a changed defaultValue otherwise.
					key={search.q ?? ""}
					defaultValue={search.q ?? ""}
					placeholder={c.searchPlaceholder.value}
					onBlur={(event) => onQueryChange(event.currentTarget.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							onQueryChange(event.currentTarget.value);
						}
					}}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor={statusId} className="font-medium text-sm">
					{c.statusLabel}
				</label>
				<Select
					value={search.status}
					onValueChange={(value) => onStatusChange(value as StatusFilter)}
				>
					<SelectTrigger id={statusId} className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{STATUS_FILTERS.map((status) => (
							<SelectItem key={status} value={status}>
								{statusOptions[status]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor={sizeId} className="font-medium text-sm">
					{c.pageSizeLabel}
				</label>
				<Select
					value={String(search.pageSize)}
					// `toPageSize` and not `Number(value)`. A `<select>` value is a
					// string, `Number()` returns a `number`, and `number` is not a
					// `PageSize` — that gap is where `?pageSize=999` used to become
					// reachable, type-check, and then get silently reset to 20 by the
					// schema's `.catch()` one layer later.
					//
					// The `null` branch cannot fire: the options below are built from
					// `PAGE_SIZE_OPTIONS`, so the only values this control emits are
					// already page sizes. Ignoring it rather than defaulting keeps
					// that invariant honest — if the options ever stop matching, the
					// picker goes inert instead of quietly choosing for the user.
					onValueChange={(value) => {
						const size = toPageSize(value);
						if (size !== null) onPageSizeChange(size);
					}}
				>
					<SelectTrigger id={sizeId} className="w-24">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{/*
							Two spellings of the same number, deliberately. The VALUE is a
							protocol token that `toPageSize` parses back with `Number()`, so it
							must stay machine-readable — `Number("1,000")` is NaN, and the day
							someone adds 1000 to PAGE_SIZE_OPTIONS a grouped value would make
							the picker silently inert. The LABEL is presentation, so it is
							formatted.
						*/}
						{PAGE_SIZE_OPTIONS.map((size) => (
							<SelectItem key={size} value={String(size)}>
								{f.integer(size)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
