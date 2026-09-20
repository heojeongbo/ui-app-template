import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";
import type { proto } from "@template/interfaces";
import { BoxIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
	itemQueries,
	type StatusFilter,
	statusFromFilter,
} from "@/entities/item";
import { ItemEditorDialog } from "@/features/item-editor";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

import { itemsContent } from "./items.content";
import { ItemsFilterBar } from "./items.filter-bar";
import {
	applyPage,
	applyPageSize,
	applyQuery,
	applyStatusFilter,
	correctOverflowPage,
	hasActiveFilters,
	type ItemsSearch,
} from "./items.filters";
import { ItemsPager } from "./items.pager";
import { ItemsTable } from "./items.table";
import { useItemActions } from "./use-item-actions";

const route = getRouteApi("/(auth)/(shell)/items/");

/**
 * The items screen.
 *
 * It renders and delegates. Every decision — what a filter change does to the
 * page number, whether the empty state means "nothing yet" or "nothing
 * matches", what the range label says — lives in `items.filters.ts`, because a
 * scenario test cannot reach into a JSX handler. That is the rule, and this
 * component is what it looks like when the rule is followed: no ternaries in
 * handlers, no arithmetic inline.
 */
export function ItemsPage() {
	const search = route.useSearch();
	const navigate = route.useNavigate();

	// `undefined` = closed, `null` = create, an item = edit. One state instead
	// of an `open` boolean plus a `mode` plus a `selected`, which can disagree.
	const [editing, setEditing] = useState<
		proto.example_v1.Item | null | undefined
	>(undefined);
	const { pendingId, remove } = useItemActions();

	const params = {
		page: search.page,
		pageSize: search.pageSize,
		status: statusFromFilter(search.status),
		query: search.q,
	};

	// `useSuspenseQuery` and not `useQuery`: the route's loader has already
	// primed this exact key via `ensureQueryData`, so the data is present on
	// first render and there is no `data === undefined` branch to write.
	const { data, isFetching } = useSuspenseQuery(itemQueries.list(params));

	const update = (next: ItemsSearch) => {
		// `replace` so filtering does not fill the back stack with every
		// keystroke — the back button should leave the screen, not undo a filter
		// one character at a time.
		void navigate({ search: next, replace: true });
	};

	// S5: a page past the end corrects itself once the total is known.
	// `correctOverflowPage` returns null when nothing needs to change, which is
	// what stops this from navigating to where it already is on every render.
	useEffect(() => {
		const corrected = correctOverflowPage(search, data.total);
		if (corrected) void navigate({ search: corrected, replace: true });
	}, [search, data.total, navigate]);

	const filtering = hasActiveFilters(search);

	return (
		<div className="flex flex-col">
			<PageHeader
				title={itemsContent.title}
				description={itemsContent.description}
				actions={
					<Button onClick={() => setEditing(null)}>
						<PlusIcon aria-hidden="true" />
						{itemsContent.create}
					</Button>
				}
			/>

			<div className="flex flex-col gap-4 px-6 pb-6">
				<ItemsFilterBar
					search={search}
					onStatusChange={(status: StatusFilter) =>
						update(applyStatusFilter(search, status))
					}
					onQueryChange={(value) => update(applyQuery(search, value))}
					onPageSizeChange={(size) => update(applyPageSize(search, size))}
				/>

				{data.items.length === 0 ? (
					<EmptyState
						icon={BoxIcon}
						title={
							filtering
								? itemsContent.emptyFilteredTitle
								: itemsContent.emptyTitle
						}
						description={
							filtering
								? itemsContent.emptyFilteredDescription
								: itemsContent.emptyDescription
						}
						action={
							filtering ? (
								<Button
									variant="outline"
									onClick={() =>
										update({ ...search, status: "all", q: undefined, page: 1 })
									}
								>
									{itemsContent.clearFilters}
								</Button>
							) : (
								<Button onClick={() => setEditing(null)}>
									<PlusIcon aria-hidden="true" />
									{itemsContent.create}
								</Button>
							)
						}
					/>
				) : (
					<>
						{/*
							Stale-while-revalidate: the rows stay, dimmed, rather than
							collapsing back to a skeleton. `isFetching` without the
							suspense-pending case is what distinguishes "refreshing what
							you can see" from "loading for the first time".
						*/}
						<ItemsTable
							items={data.items}
							refreshing={isFetching}
							pendingId={pendingId}
							onEdit={setEditing}
							onDelete={remove}
						/>
						<ItemsPager
							search={search}
							total={data.total}
							onPageChange={(page) => update(applyPage(search, page))}
						/>
					</>
				)}
			</div>

			{/*
				Mounted only while open, and keyed on the item: a dialog that stays
				mounted keeps the previous row's form state, so opening a second
				row shows the first one's values for a frame.
			*/}
			{editing !== undefined ? (
				<ItemEditorDialog
					key={editing?.id ?? "new"}
					open
					onOpenChange={(next) => {
						if (!next) setEditing(undefined);
					}}
					item={editing ?? undefined}
				/>
			) : null}
		</div>
	);
}
