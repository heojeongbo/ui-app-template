import { type Dictionary, insert, t } from "intlayer";

/**
 * Everything this screen says.
 *
 * Note the two different empty states. They are not a nicety: a user looking
 * at "No items yet" needs a create button, and a user looking at "Nothing
 * matches" needs a clear-filters button. One message for both sends half of
 * them to the wrong action.
 */
export default {
	key: "items",
	content: {
		title: t({ "en-US": "Items", "ko-KR": "품목" }),
		description: t({
			"en-US": "Everything in the catalogue.",
			"ko-KR": "카탈로그의 모든 항목입니다.",
		}),

		create: t({ "en-US": "New item", "ko-KR": "새 품목" }),

		// Keyed by column id, not by array position. The header row is written
		// out in items.table.tsx, and the day a column moves, position-keyed
		// labels put the wrong word over every cell in it.
		columns: {
			name: t({ "en-US": "Name", "ko-KR": "이름" }),
			status: t({ "en-US": "Status", "ko-KR": "상태" }),
			description: t({ "en-US": "Description", "ko-KR": "설명" }),
			created: t({ "en-US": "Created", "ko-KR": "생성일" }),
			actions: t({ "en-US": "Actions", "ko-KR": "작업" }),
		},

		// The accessible name for a row's icon-only buttons — ONE interpolating
		// entry per action, not `{c.edit}: {item.name}` assembled in JSX. The
		// separator and the word order are part of the sentence: Korean wants
		// the name first, and it cannot reorder a ": " that lives in the markup.
		editItem: insert(
			t({ "en-US": "Edit: {{name}}", "ko-KR": "{{name}} 편집" }),
		),
		deleteItem: insert(
			t({ "en-US": "Delete: {{name}}", "ko-KR": "{{name}} 삭제" }),
		),

		searchPlaceholder: t({ "en-US": "Search items", "ko-KR": "품목 검색" }),
		statusLabel: t({ "en-US": "Status", "ko-KR": "상태" }),
		pageSizeLabel: t({ "en-US": "Per page", "ko-KR": "페이지당" }),

		// The FILTER vocabulary — what the dropdown offers, including
		// "everything".
		statusOptions: {
			all: t({ "en-US": "All statuses", "ko-KR": "모든 상태" }),
			draft: t({ "en-US": "Draft", "ko-KR": "초안" }),
			active: t({ "en-US": "Active", "ko-KR": "활성" }),
			archived: t({ "en-US": "Archived", "ko-KR": "보관됨" }),
		},

		// The DISPLAY vocabulary — what a row's badge says. Deliberately a
		// different set: a row is never "All statuses", and it CAN be a status
		// this build does not know, if the server is ahead of the client.
		statusLabels: {
			draft: t({ "en-US": "Draft", "ko-KR": "초안" }),
			active: t({ "en-US": "Active", "ko-KR": "활성" }),
			archived: t({ "en-US": "Archived", "ko-KR": "보관됨" }),
			unknown: t({ "en-US": "Unknown", "ko-KR": "알 수 없음" }),
		},

		// Named placeholders, not positional arguments — which is what the old
		// `(from, to, total) => …` was reaching for and could not express.
		// Korean genuinely reorders this one, and `{{total}}` moving to the
		// front is legible to a translator who does not read TypeScript.
		//
		// The numbers arrive ALREADY FORMATTED (see shared/lib/format): if this
		// took raw numbers the dictionary would have to know the locale a second
		// time, and the two could disagree.
		range: insert(
			t({
				"en-US": "{{from}}–{{to}} of {{total}}",
				"ko-KR": "총 {{total}}개 중 {{from}}–{{to}}",
			}),
		),
		page: insert(
			t({
				"en-US": "Page {{current}} of {{last}}",
				"ko-KR": "{{last}}페이지 중 {{current}}페이지",
			}),
		),
		previous: t({ "en-US": "Previous", "ko-KR": "이전" }),
		next: t({ "en-US": "Next", "ko-KR": "다음" }),

		emptyTitle: t({ "en-US": "No items yet", "ko-KR": "아직 품목이 없습니다" }),
		emptyDescription: t({
			"en-US": "Create the first one to get started.",
			"ko-KR": "첫 품목을 만들어 시작하세요.",
		}),
		emptyFilteredTitle: t({
			"en-US": "No items match these filters",
			"ko-KR": "이 필터에 맞는 품목이 없습니다",
		}),
		emptyFilteredDescription: t({
			"en-US": "Try a different status, or clear the search.",
			"ko-KR": "다른 상태를 고르거나 검색어를 지워보세요.",
		}),
		clearFilters: t({ "en-US": "Clear filters", "ko-KR": "필터 지우기" }),

		// Announced, not just shown: the table dims on a refetch, which tells a
		// sighted user something is happening and tells a screen-reader user
		// nothing. See docs/ux/states.md.
		refreshing: t({ "en-US": "Refreshing…", "ko-KR": "새로 고치는 중…" }),

		// The date column's empty cell. A translator may want "없음" or "N/A",
		// and an em dash announces as nothing useful — so it is copy, not
		// punctuation.
		noDate: t({ "en-US": "—", "ko-KR": "없음" }),

		// --- mutation outcomes ------------------------------------------------
		// Each says what is true RIGHT NOW, and never claims a failure when the
		// answer was merely lost. See docs/ux/copy.md.
		//
		// No `created` / `updated` here: the EDITOR owns those outcomes and says
		// them from item-editor.content.ts. Two dictionaries saying the same
		// sentence is how they drift.
		deleted: insert(
			t({
				"en-US": "Deleted “{{name}}”.",
				"ko-KR": "“{{name}}”을(를) 삭제했습니다.",
			}),
		),
		// Says what actually happened. The undo recreates rather than restores,
		// so the row comes back with a new id — claiming "restored" would be a
		// lie the user only discovers when an old link 404s.
		restored: insert(
			t({
				"en-US": "Re-created “{{name}}” with a new id.",
				"ko-KR": "“{{name}}”을(를) 새 id로 다시 만들었습니다.",
			}),
		),
		restoreFailed: t({
			"en-US": "Could not put the item back.",
			"ko-KR": "품목을 되돌리지 못했습니다.",
		}),

		deleteFailed: t({
			"en-US": "Could not delete the item.",
			"ko-KR": "품목을 삭제하지 못했습니다.",
		}),
		// Indeterminate: the write may have landed.
		unconfirmed: t({
			"en-US":
				"Could not confirm the change. Refresh to see the current state.",
			"ko-KR": "변경을 확인하지 못했습니다. 새로고침해 현재 상태를 확인하세요.",
		}),

		confirmDeleteTitle: t({
			"en-US": "Delete this item?",
			"ko-KR": "이 품목을 삭제할까요?",
		}),
		confirmDeleteBody: insert(
			t({
				"en-US": "“{{name}}” will be removed. This cannot be undone from here.",
				"ko-KR": "“{{name}}”이(가) 제거됩니다. 여기서는 되돌릴 수 없습니다.",
			}),
		),

		// The editor island's failure. Says what still works ("your list is
		// fine") rather than only what broke, because the user's next question
		// is whether they have lost anything — and here they have not.
		editorFailedTitle: t({
			"en-US": "This editor could not be shown",
			"ko-KR": "편집기를 표시할 수 없습니다",
		}),
		editorFailedDescription: t({
			"en-US":
				"Something went wrong opening this item. Your list is unaffected.",
			"ko-KR":
				"이 품목을 여는 중 문제가 발생했습니다. 목록에는 영향이 없습니다.",
		}),
	},
} satisfies Dictionary;
