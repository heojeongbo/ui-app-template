import { type Dictionary, t } from "intlayer";

/**
 * Everything this screen says.
 *
 * The voice rules these follow (docs/ux/copy.md):
 * - Sentence case, not Title Case.
 * - Say what is true right now. "Signing in…" while the request is open, not
 *   "Signed in".
 * - Never claim a failure when the answer was merely lost — "Could not
 *   confirm" beats "Failed" for a request that may well have succeeded.
 */
export default {
	key: "signin",
	content: {
		title: t({ "en-US": "Sign in", "ko-KR": "로그인" }),
		description: t({
			"en-US": "Use your account to continue.",
			"ko-KR": "계정으로 계속 진행하세요.",
		}),

		usernameLabel: t({ "en-US": "Username", "ko-KR": "사용자 이름" }),
		passwordLabel: t({ "en-US": "Password", "ko-KR": "비밀번호" }),

		submit: t({ "en-US": "Sign in", "ko-KR": "로그인" }),
		submitting: t({ "en-US": "Signing in…", "ko-KR": "로그인 중…" }),

		// Fed to zod, so the call site passes `.value` — see the shape table in
		// docs/ux/copy.md.
		usernameRequired: t({
			"en-US": "Enter your username.",
			"ko-KR": "사용자 이름을 입력하세요.",
		}),
		passwordRequired: t({
			"en-US": "Enter your password.",
			"ko-KR": "비밀번호를 입력하세요.",
		}),
		// No "too short" message here on purpose. A length rule belongs to the
		// screen that CREATES a password, not the one that checks it — see
		// signin.schema.ts.

		// A definite refusal. The server said no, and said why.
		rejected: t({
			"en-US": "That username and password do not match.",
			"ko-KR": "사용자 이름과 비밀번호가 일치하지 않습니다.",
		}),
		// An indeterminate failure. The request may have gone through; do not
		// claim it did not.
		unreachable: t({
			"en-US": "Could not reach the server. Check your connection and retry.",
			"ko-KR":
				"서버에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도하세요.",
		}),
	},
} satisfies Dictionary;
