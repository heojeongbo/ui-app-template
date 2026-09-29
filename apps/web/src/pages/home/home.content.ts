import { type Dictionary, t } from "intlayer";

/**
 * Everything this screen says.
 *
 * Three strings is not enough copy to need a module, and that is exactly why
 * the module exists. The convention has to hold at the small end or it does
 * not hold: this file is the first screen a reader opens, and a screen that
 * inlines "just these three" teaches that inlining is fine — after which the
 * fourth screen inlines twelve.
 */
export default {
	key: "home",
	content: {
		title: t({ "en-US": "Home", "ko-KR": "홈" }),
		description: t({
			"en-US": "A starting point. Replace this screen with your own.",
			"ko-KR": "시작점입니다. 이 화면을 여러분의 것으로 바꾸세요.",
		}),
		browseItems: t({ "en-US": "Browse items", "ko-KR": "품목 둘러보기" }),
	},
} satisfies Dictionary;
