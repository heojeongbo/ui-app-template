import { type Dictionary, t } from "intlayer";

/**
 * Everything the route error surface says.
 *
 * Two distinct messages for two distinct situations, and keeping them apart is
 * the point of the module rather than an accident of extraction:
 *
 * - `fallbackDescription` is used only when the error carries nothing a human
 *   wrote. An indeterminate failure's own message is transport detail
 *   ("fetch failed"), which tells a user nothing and reads as a bug.
 * - `definiteNote` appears only for a failure the server already ruled on.
 *   Without it the retry button invites the user to press it three times to
 *   discover that the answer will not change.
 */
export default {
	key: "route-error",
	content: {
		title: t({
			"en-US": "Could not load this page",
			"ko-KR": "이 페이지를 불러오지 못했습니다",
		}),
		fallbackDescription: t({
			"en-US": "Something went wrong loading this page.",
			"ko-KR": "이 페이지를 불러오는 중 문제가 발생했습니다.",
		}),
		definiteNote: t({
			"en-US":
				"This is unlikely to resolve on its own. If it persists, the request may no longer be valid.",
			"ko-KR":
				"저절로 해결될 가능성은 낮습니다. 계속된다면 요청이 더 이상 유효하지 않을 수 있습니다.",
		}),
	},
} satisfies Dictionary;
