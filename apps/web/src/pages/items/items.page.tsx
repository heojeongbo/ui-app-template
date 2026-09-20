import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";
import type { proto } from "@template/interfaces";
import { BoxIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { itemQueries, type StatusFilter } from "@/entities/item";
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
	clearFilters,
	correctOverflowPage,
	hasActiveFilters,
	type ItemsSearch,
	itemsListParams,
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

	// `useSuspenseQuery` and not `useQuery`: the route's loader has already
	// primed this exact key via `ensureQueryData`, so the data is present on
	// first render and there is no `data === undefined` branch to write.
	const { data, isFetching } = useSuspenseQuery(
		itemQueries.list(itemsListParams(search)),
	);

	/**
	 * Navigate by DERIVING from the current search, never from the render's
	 * closure.
	 *
	 * `navigate({ search: fn })` hands `fn` the search as it is right now. The
	 * obvious alternative — computing the next object up here and passing it —
	 * reads `search` from the render that created the handler, so two clicks
	 * before React re-renders both compute from the same stale page. Clicking
	 * Next twice quickly then lands on page 2 instead of 3, silently skipping
	 * one. Caught by the journey e2e; isolated tests cannot see it, because
	 * they never click twice.
	 *
	 * `replace` so filtering does not fill the back stack with every keystroke
	 * — the back button should leave the screen, not undo a filter one
	 * character at a time.
	 */
	const update = (change: (prev: ItemsSearch) => ItemsSearch) => {
		void navigate({ search: change, replace: true });
	};

	// S5: a page past the end corrects itself once the total is known.
	// `correctOverflowPage` returns null when nothing needs to change, which is
	// what stops this from navigating to where it already is on every render.
	useEffect(() => {
		if (!correctOverflowPage(search, data.total)) return;
		// Functional here too, for the same reason: between this effect being
		// scheduled and running, the search may already have moved on.
		void navigate({
			search: (prev: ItemsSearch) =>
				correctOverflowPage(prev, data.total) ?? prev,
			replace: true,
		});
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
						update((prev) => applyStatusFilter(prev, status))
					}
					onQueryChange={(value) => update((prev) => applyQuery(prev, value))}
					onPageSizeChange={(size) =>
						update((prev) => applyPageSize(prev, size))
					}
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
								<Button variant="outline" onClick={() => update(clearFilters)}>
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
							// A DIRECTION, not a page number. The pager cannot compute
							// `page + 1` correctly either — its `search` prop is from the
							// same stale render.
							onStep={(delta) =>
								update((prev) => applyPage(prev, prev.page + delta))
							}
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
