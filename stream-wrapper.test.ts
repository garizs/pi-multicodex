import { describe, expect, it, vi } from "vitest";
import type { Account } from "./storage";
import { createStreamWrapper } from "./stream-wrapper";

function makeAccount(email: string): Account {
	return {
		email,
		accessToken: `${email}-access`,
		refreshToken: `${email}-refresh`,
		expiresAt: Date.now() + 3_600_000,
	};
}

function makeDoneEvent(provider = "openai-codex") {
	return {
		type: "done",
		reason: "stop",
		message: { provider, content: [] },
	};
}

function makeQuotaErrorEvent(
	provider = "openai-codex",
	errorMessage = "You have hit your ChatGPT usage limit.",
) {
	return {
		type: "error",
		reason: "error",
		error: {
			provider,
			errorMessage,
		},
	};
}

function makeAsyncStream(events: unknown[]) {
	return (async function* () {
		for (const event of events) {
			yield event;
		}
	})() as never;
}

async function collect(stream: AsyncIterable<unknown>): Promise<unknown[]> {
	const events: unknown[] = [];
	for await (const event of stream) {
		events.push(event);
	}
	return events;
}

describe("createStreamWrapper", () => {
	it("forces SSE transport so manual account selection cannot reuse another account's websocket", async () => {
		const manual = makeAccount("manual@example.com");
		const manager = {
			waitUntilReady: vi.fn().mockResolvedValue(undefined),
			getAvailableManualAccount: vi.fn().mockReturnValue(manual),
			hasManualAccount: vi.fn().mockReturnValue(true),
			clearManualAccount: vi.fn(),
			activateBestAccount: vi.fn(),
			ensureValidToken: vi.fn().mockResolvedValue("manual-token"),
			notifyRotationSkipForAuthFailure: vi.fn(),
			handleQuotaExceeded: vi.fn(),
		};
		const baseProvider = {
			streamSimple: vi.fn().mockReturnValue(makeAsyncStream([makeDoneEvent()])),
		};

		const stream = createStreamWrapper(manager as never, baseProvider as never)(
			{
				provider: "openai-codex",
				api: "openai-codex-responses",
				id: "gpt",
			} as never,
			{} as never,
			{
				transport: "auto",
				apiKey: "stale-token",
				sessionId: "session-1",
			} as never,
		);
		await collect(stream as never);

		expect(baseProvider.streamSimple).toHaveBeenCalledOnce();
		expect(baseProvider.streamSimple.mock.calls[0]?.[2]).toMatchObject({
			transport: "sse",
			apiKey: "manual-token",
			sessionId: "session-1",
		});
	});

	it("retries with the next account on a pre-output FREE PLAN EXCEEDED error", async () => {
		const first = makeAccount("first@example.com");
		const second = makeAccount("second@example.com");
		const manager = {
			waitUntilReady: vi.fn().mockResolvedValue(undefined),
			getAvailableManualAccount: vi.fn().mockReturnValue(undefined),
			hasManualAccount: vi.fn().mockReturnValue(false),
			clearManualAccount: vi.fn(),
			activateBestAccount: vi
				.fn()
				.mockResolvedValueOnce(first)
				.mockResolvedValueOnce(second),
			ensureValidToken: vi.fn(
				async (account: Account) => `${account.email}-token`,
			),
			notifyRotationSkipForAuthFailure: vi.fn(),
			handleQuotaExceeded: vi.fn().mockResolvedValue(undefined),
		};
		const baseProvider = {
			streamSimple: vi
				.fn()
				.mockReturnValueOnce(
					makeAsyncStream([
						makeQuotaErrorEvent("openai-codex", "FREE PLAN EXCEEDED"),
					]),
				)
				.mockReturnValueOnce(makeAsyncStream([makeDoneEvent()])),
		};

		const stream = createStreamWrapper(manager as never, baseProvider as never)(
			{
				provider: "openai-codex",
				api: "openai-codex-responses",
				id: "gpt",
			} as never,
			{} as never,
			{ transport: "auto" } as never,
		);
		const events = await collect(stream as never);

		expect(manager.handleQuotaExceeded).toHaveBeenCalledWith(first, {
			signal: undefined,
		});
		expect(manager.activateBestAccount).toHaveBeenCalledTimes(2);
		expect(baseProvider.streamSimple).toHaveBeenCalledTimes(2);
		expect(baseProvider.streamSimple.mock.calls[0]?.[2]).toMatchObject({
			transport: "sse",
			apiKey: "first@example.com-token",
		});
		expect(baseProvider.streamSimple.mock.calls[1]?.[2]).toMatchObject({
			transport: "sse",
			apiKey: "second@example.com-token",
		});
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ type: "done" });
	});
});
