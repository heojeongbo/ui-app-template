import { toDate } from "@template/core/proto";
import { cn } from "@template/design/lib/utils";
import { Badge } from "@template/design/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@template/design/ui/table";
import type { proto } from "@template/interfaces";

import { statusKey, statusTone } from "@/entities/item";

import { itemsContent } from "./items.content";
import { ItemRowActions } from "./items.row-actions";

const TONE_VARIANT = {
	success: "default",
	muted: "outline",
	neutral: "secondary",
} as const;

/**
 * The rows.
 *
 * `refreshing` dims the table instead of replacing it. Collapsing back to a
 * skeleton on every refetch makes a list that polls or revalidates feel like
 * it is constantly reloading, and it loses the user's scroll position.
 */
export function ItemsTable({
	items,
	refreshing,
	pendingId,
	onEdit,
	onDelete,
}: {
	items: readonly proto.example_v1.Item[];
	refreshing: boolean;
	pendingId: string | null;
	onEdit: (item: proto.example_v1.Item) => void;
	onDelete: (item: proto.example_v1.Item) => void;
}) {
	return (
		<div
			className={cn(
				"rounded-lg border transition-opacity duration-200",
				refreshing && "opacity-60",
			)}
			// Announce the refresh; the visual dimming says nothing to a screen
			// reader.
			aria-busy={refreshing || undefined}
		>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Created</TableHead>
						<TableHead className="w-24 text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => {
						const key = statusKey(item.status);
						const created = toDate(item.createdAt);

						return (
							<TableRow key={item.id}>
								<TableCell className="font-medium">{item.name}</TableCell>
								<TableCell>
									<Badge variant={TONE_VARIANT[statusTone(item.status)]}>
										{itemsContent.statusLabels[key]}
									</Badge>
								</TableCell>
								<TableCell className="max-w-md truncate text-muted-foreground">
									{item.description}
								</TableCell>
								{/*
									`toDate` and not `new Date(ts.seconds * 1000)`: `seconds`
									is a bigint, so the arithmetic throws — and the field is
									optional, so the naive `!` renders "Invalid Date".
								*/}
								<TableCell className="font-mono text-muted-foreground text-xs">
									{created ? created.toISOString().slice(0, 10) : "—"}
								</TableCell>
								<TableCell>
									<ItemRowActions
										item={item}
										pendingId={pendingId}
										onEdit={onEdit}
										onDelete={onDelete}
									/>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
