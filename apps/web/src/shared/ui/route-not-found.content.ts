import { type Dictionary, t } from "intlayer";

/**
 * Everything the 404 says.
 *
 * A dictionary beside a `shared/ui` component rather than only beside a page,
 * so the rule reads the same everywhere: a user-facing string lives in a
 * content module, wherever the component lives. The alternative is a reader
 * having to know which directories the convention applies to.
 *
 * The voice matters more here than almost anywhere else. This screen is
 * reached by people who are already lost, so it says what happened and offers
 * exactly one way out — naming the destination rather than "Back", which is
 * what the browser button already does.
 */
export default {
	key: "route-not-found",
	content: {
		title: t({
			"en-US": "Page not found",
			"ko-KR": "페이지를 찾을 수 없습니다",
		}),
		description: t({
			"en-US": "The page you are looking for does not exist, or has moved.",
			"ko-KR": "찾으시는 페이지가 없거나 옮겨졌습니다.",
		}),
		goHome: t({ "en-US": "Go to the start", "ko-KR": "처음으로 가기" }),
	},
} satisfies Dictionary;
