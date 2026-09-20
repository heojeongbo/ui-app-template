import { Input } from "@template/design/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@template/design/ui/select";
import { useId } from "react";

import { STATUS_FILTERS, type StatusFilter } from "@/entities/item";
import { PAGE_SIZE_OPTIONS } from "@/shared/lib/search";

import { itemsContent } from "./items.content";
import type { ItemsSearch } from "./items.filters";

type Props = {
	search: ItemsSearch;
	onStatusChange: (status: StatusFilter) => void;
	onQueryChange: (value: string) => void;
	onPageSizeChange: (size: number) => void;
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
	const searchId = useId();
	const statusId = useId();
	const sizeId = useId();

	return (
		<div className="flex flex-wrap items-end gap-3">
			<div className="flex min-w-48 flex-1 flex-col gap-1.5">
				<label htmlFor={searchId} className="font-medium text-sm">
					{itemsContent.searchPlaceholder}
				</label>
				<Input
					id={searchId}
					type="search"
					// `key` forces a remount when the URL query changes from elsewhere
					// — "clear filters" has to visibly empty the box, and an
					// uncontrolled input ignores a changed defaultValue otherwise.
					key={search.q ?? ""}
					defaultValue={search.q ?? ""}
					placeholder={itemsContent.searchPlaceholder}
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
					{itemsContent.statusLabel}
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
								{itemsContent.statusOptions[status]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor={sizeId} className="font-medium text-sm">
					{itemsContent.pageSizeLabel}
				</label>
				<Select
					value={String(search.pageSize)}
					onValueChange={(value) => onPageSizeChange(Number(value))}
				>
					<SelectTrigger id={sizeId} className="w-24">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PAGE_SIZE_OPTIONS.map((size) => (
							<SelectItem key={size} value={String(size)}>
								{size}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
