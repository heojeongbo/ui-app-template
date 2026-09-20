import type { DescMessage, MessageShape } from "@bufbuild/protobuf";
import type {
	Interceptor,
	UnaryRequest,
	UnaryResponse,
} from "@connectrpc/connect";

/**
 * Answer an RPC locally instead of sending it.
 *
 * This is the mocking strategy for anything that has a `.proto`: the handler
 * sits in the interceptor chain, so the app's data layer is entirely unaware
 * it is being mocked. Queries, mutations, invalidation, error handling and the
 * loading states all run for real — which is the difference between a mock
 * that lets you build a screen and one that lets you build a screen that works
 * when the server arrives.
 *
 * Pair with `intercept(method, ...)` from `@template/core/api`, which is what
 * scopes a handler to one RPC. An unwrapped handler answers EVERY RPC — it has
 * no idea which method it was registered for — and it still type-checks, so
 * the mistake shows up as unrelated endpoints returning the wrong shape.
 *
 * For plain HTTP endpoints with no proto (file uploads, a health check, a
 * third-party REST API) use MSW instead — see docs/mocking.md. Hand-encoding
 * protobuf bodies at the network layer is the wrong tool; intercepting the
 * typed call is the right one.
 */
export function respond<I extends DescMessage, O extends DescMessage>(
	handler: (
		request: MessageShape<I>,
		context: UnaryRequest<I, O>,
	) => MessageShape<O> | Promise<MessageShape<O>>,
	options: { latencyMs?: number } = {},
): Interceptor {
	// Artificial latency by default, and it is not decoration. A mock that
	// answers synchronously never lets a loading state render, so skeletons and
	// pending buttons go untested until the day a real server is slow.
	const { latencyMs = 250 } = options;

	return () =>
		async (request): Promise<UnaryResponse<I, O>> => {
			const unary = request as UnaryRequest<I, O>;

			if (latencyMs > 0) {
				await new Promise((resolve) => setTimeout(resolve, latencyMs));
			}

			const message = await handler(unary.message, unary);

			return {
				stream: false,
				service: unary.service,
				method: unary.method,
				message,
				header: new Headers(),
				trailer: new Headers(),
			};
		};
}
