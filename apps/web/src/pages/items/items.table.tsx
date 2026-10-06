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
import { useIntlayer } from "react-intlayer";

import { type StatusDisplayKey, statusKey, statusTone } from "@/entities/item";
import { useFormatters } from "@/shared/lib/format";

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
	const c = useIntlayer("items");
	const f = useFormatters();

	// Re-stated on the READ side: the compiler sees the GENERATED dictionary
	// type here, not the declaration, so this is where a missing status label
	// has to fail. `statusKey` narrows to exactly these four.
	const statusLabels = c.statusLabels satisfies Record<
		StatusDisplayKey,
		unknown
	>;

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
						<TableHead>{c.columns.name}</TableHead>
						<TableHead>{c.columns.status}</TableHead>
						<TableHead>{c.columns.description}</TableHead>
						<TableHead>{c.columns.created}</TableHead>
						<TableHead className="w-24 text-end">{c.columns.actions}</TableHead>
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
										{statusLabels[key]}
									</Badge>
								</TableCell>
								{/*
									`line-clamp-2` rather than `truncate`: this is USER content,
									and a single clipped line with no tooltip is unrecoverable.
									Two lines shows the whole description for almost every value,
									still bounds the row height, and degrades in any script — CJK
									packs roughly twice the information per character, so a
									one-line clip loses a different amount in every language.

									`whitespace-normal` is required to beat TableCell's global
									`whitespace-nowrap`; `title` covers the genuinely long tail.
								*/}
								<TableCell
									className="line-clamp-2 max-w-md whitespace-normal break-words text-muted-foreground"
									title={item.description}
								>
									{item.description}
								</TableCell>
								{/*
									`toDate` and not `new Date(ts.seconds * 1000)`: `seconds`
									is a bigint, so the arithmetic throws — and the field is
									optional, so the naive `!` renders "Invalid Date".
									
									This cell used to render `toISOString().slice(0, 10)`, which was
									wrong in a way that had nothing to do with translation:
									`toISOString` gives the UTC calendar day. A row created at
									2026-01-01T23:00Z showed as 2026-01-01 to someone in Asia/Seoul
									whose wall clock said 2026-01-02 08:00 — an off-by-one day,
									invisible to anyone developing in UTC, and reproduced by the
									fixtures (EPOCH + 16h is Jan 1 in UTC and Jan 2 in Seoul).
									
									No `timeZone` is passed: the user's wall clock is the frame they
									judge "today" by. Determinism in tests is bought with Playwright's
									`timezoneId` and Vitest's `TZ`, never by pinning one here.
									
									`font-mono` went with the fixed-width ISO string it was pairing
									with: no font in `--font-mono` carries a CJK glyph, so `2026. 1. 1.`
									would fall back mid-string to another family with different metrics.
									`<time dateTime>` keeps the exact instant in the DOM, which the ISO
									string was the only thing preserving.
								*/}
								<TableCell className="text-muted-foreground text-xs tabular-nums">
									{created ? (
										<time
											dateTime={created.toISOString()}
											title={f.dateTime(created)}
										>
											{f.date(created)}
										</time>
									) : (
										c.noDate
									)}
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
