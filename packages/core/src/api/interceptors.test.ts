import type { Interceptor } from "@connectrpc/connect";
import { describe, expect, it } from "vitest";

import { acceptLanguageInterceptor } from "./interceptors";

/**
 * The interceptor touches exactly one field of a Connect request, so the test
 * supplies exactly that — cast through `unknown` rather than `any`, which
 * keeps the ban intact and states what is being stood in for.
 */
type AnyRequest = Parameters<ReturnType<Interceptor>>[0];
type AnyResponse = Awaited<ReturnType<ReturnType<Interceptor>>>;

function fakeRequest() {
	const req = { header: new Headers() };
	return { req, asRequest: req as unknown as AnyRequest };
}

/** Hands the request straight back, so the assertion reads what was stamped. */
const echo = async (req: AnyRequest) => req as unknown as AnyResponse;

describe("acceptLanguageInterceptor", () => {
	it("stamps the header", async () => {
		const { req, asRequest } = fakeRequest();

		await acceptLanguageInterceptor(() => "ko-KR")(echo)(asRequest);

		expect(req.header.get("Accept-Language")).toBe("ko-KR");
	});

	// The reason it takes a thunk rather than a value. The transport is built
	// once, at module scope, so an interceptor that captured the locale would
	// send the BOOT language for the life of the page — and the bug presents as
	// "the server ignores my language setting", which is the one place nobody
	// looks. It is also why a language switch does not have to rebuild the
	// transport, which would orphan every in-flight request.
	it("re-reads the locale on every request, so a switch takes effect", async () => {
		let locale = "en-US";
		const send = acceptLanguageInterceptor(() => locale)(echo);

		const first = fakeRequest();
		await send(first.asRequest);
		expect(first.req.header.get("Accept-Language")).toBe("en-US");

		locale = "ko-KR";

		const second = fakeRequest();
		await send(second.asRequest);
		expect(second.req.header.get("Accept-Language")).toBe("ko-KR");
	});
});
