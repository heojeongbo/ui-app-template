import { type Dictionary, insert, t } from "intlayer";

/**
 * Copy for the editor.
 *
 * The failure messages follow the tone rules in docs/ux/copy.md: a definite
 * refusal says what happened, an indeterminate one never claims the write
 * failed, because it may well have landed.
 */
export default {
	key: "item-editor",
	content: {
		createTitle: t({ "en-US": "New item", "ko-KR": "새 품목" }),
		createDescription: t({
			"en-US": "Add an item to the catalogue.",
			"ko-KR": "카탈로그에 품목을 추가합니다.",
		}),
		editTitle: t({ "en-US": "Edit item", "ko-KR": "품목 편집" }),
		editDescription: t({
			"en-US": "Change this item's details.",
			"ko-KR": "이 품목의 정보를 변경합니다.",
		}),

		nameLabel: t({ "en-US": "Name", "ko-KR": "이름" }),
		descriptionLabel: t({ "en-US": "Description", "ko-KR": "설명" }),
		statusLabel: t({ "en-US": "Status", "ko-KR": "상태" }),

		// No `all` entry: the editor picks ONE status, it does not filter. The
		// dead entry that used to be here is what made an unlabelled status
		// render cleanly as "All statuses" instead of showing up as undefined.
		statusOptions: {
			draft: t({ "en-US": "Draft", "ko-KR": "초안" }),
			active: t({ "en-US": "Active", "ko-KR": "활성" }),
			archived: t({ "en-US": "Archived", "ko-KR": "보관됨" }),
			unknown: t({ "en-US": "Unknown", "ko-KR": "알 수 없음" }),
		},

		// Fed to zod, so the call site passes `.value`. The number is
		// interpolated rather than written into the sentence, so the limit and
		// the message cannot drift — both read ITEM_LIMITS.
		nameRequired: t({
			"en-US": "Enter a name.",
			"ko-KR": "이름을 입력하세요.",
		}),
		nameTooLong: insert(
			t({
				"en-US": "Keep the name under {{max}} characters.",
				"ko-KR": "이름은 {{max}}자 미만으로 입력하세요.",
			}),
		),
		descriptionTooLong: insert(
			t({
				"en-US": "Keep the description under {{max}} characters.",
				"ko-KR": "설명은 {{max}}자 미만으로 입력하세요.",
			}),
		),

		created: insert(
			t({
				"en-US": "Created “{{name}}”.",
				"ko-KR": "“{{name}}”을(를) 만들었습니다.",
			}),
		),
		updated: insert(
			t({
				"en-US": "Updated “{{name}}”.",
				"ko-KR": "“{{name}}”을(를) 수정했습니다.",
			}),
		),
		nothingChanged: t({
			"en-US": "Nothing changed.",
			"ko-KR": "변경된 내용이 없습니다.",
		}),

		createFailed: t({
			"en-US": "Could not create the item.",
			"ko-KR": "품목을 만들지 못했습니다.",
		}),
		updateFailed: t({
			"en-US": "Could not update the item.",
			"ko-KR": "품목을 수정하지 못했습니다.",
		}),
		// The write may have landed — say what is true, not what is convenient.
		unconfirmed: t({
			"en-US":
				"Could not confirm the change. Refresh to see the current state.",
			"ko-KR": "변경을 확인하지 못했습니다. 새로고침해 현재 상태를 확인하세요.",
		}),

		// The unsaved-changes prompt. Names what is lost ("your edits") and what
		// each button does — "Discard" and "Keep editing" rather than OK/Cancel,
		// because a user skimming a dialog should not have to work out which
		// button destroys their work.
		discard: {
			title: t({
				"en-US": "Discard your changes?",
				"ko-KR": "변경사항을 버릴까요?",
			}),
			body: t({
				"en-US":
					"This item has edits that have not been saved. Leaving now loses them.",
				"ko-KR": "저장하지 않은 수정 내용이 있습니다. 지금 나가면 사라집니다.",
			}),
			confirmLabel: t({ "en-US": "Discard", "ko-KR": "버리기" }),
			cancelLabel: t({ "en-US": "Keep editing", "ko-KR": "계속 편집" }),
		},
	},
} satisfies Dictionary;
