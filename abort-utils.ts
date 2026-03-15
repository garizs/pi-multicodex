export function createLinkedAbortController(
	signal?: AbortSignal,
): AbortController {
	const controller = new AbortController();
	if (signal?.aborted) {
		controller.abort();
		return controller;
	}

	signal?.addEventListener("abort", () => controller.abort(), { once: true });
	return controller;
}

export function createTimeoutController(
	signal: AbortSignal | undefined,
	timeoutMs: number,
): { controller: AbortController; clear: () => void } {
	const controller = createLinkedAbortController(signal);
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	return {
		controller,
		clear: () => clearTimeout(timeout),
	};
}
