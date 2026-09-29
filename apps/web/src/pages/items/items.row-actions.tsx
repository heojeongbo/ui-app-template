import { Button } from "@template/design/ui/button";
import type { proto } from "@template/interfaces";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useIntlayer } from "react-intlayer";

/**
 * Per-row actions.
 *
 * `pendingId` names WHICH row is acting; `busy` disables the rest. One piece
 * of state for both, because the alternative — a boolean per row — cannot
 * express "this one is working, the others must wait", and a grid of buttons
 * where every one stays clickable during a delete is how two deletes race.
 */
export function ItemRowActions({
	item,
	pendingId,
	onEdit,
	onDelete,
}: {
	item: proto.example_v1.Item;
	pendingId: string | null;
	onEdit: (item: proto.example_v1.Item) => void;
	onDelete: (item: proto.example_v1.Item) => void;
}) {
	const c = useIntlayer("items");
	const busy = pendingId !== null;
	const pending = pendingId === item.id;

	return (
		<div className="flex justify-end gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={busy}
				onClick={() => onEdit(item)}
			>
				<PencilIcon aria-hidden="true" />
				{/*
					Icon-only buttons need an accessible name; the icon is decorative.
					The whole sentence comes from one content entry — assembling it
					here would put the separator and the word order in the markup,
					where no translation can reach them.
				*/}
				<span className="sr-only">{c.editItem({ name: item.name })}</span>
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				disabled={busy}
				aria-busy={pending || undefined}
				onClick={() => onDelete(item)}
			>
				<Trash2Icon aria-hidden="true" />
				<span className="sr-only">{c.deleteItem({ name: item.name })}</span>
			</Button>
		</div>
	);
}
