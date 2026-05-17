import {
	type Context,
	getApiProvider,
	getModels,
	type Model,
} from "@earendil-works/pi-ai";
import type { AccountManager } from "./account-manager";
import { isQuotaErrorMessage } from "./quota";
import type { Account } from "./storage";

const WARMUP_TIMEOUT_MS = 30_000;
const WARMUP_MAX_TOKENS = 1;
const WARMUP_PROMPT = "ping";

function getWarmupModel(): Model<"openai-codex-responses"> | undefined {
	const models = getModels("openai-codex").filter(
		(model): model is Model<"openai-codex-responses"> =>
			model.api === "openai-codex-responses",
	);
	return models.sort((a, b) => {
		const aCost = a.cost.input + a.cost.output;
		const bCost = b.cost.input + b.cost.output;
		if (aCost !== bCost) return aCost - bCost;
		return a.maxTokens - b.maxTokens;
	})[0];
}

function createWarmupContext(): Context {
	return {
		systemPrompt: "Reply with exactly one short token.",
		messages: [
			{
				role: "user",
				content: WARMUP_PROMPT,
				timestamp: Date.now(),
			},
		],
	};
}

async function runWarmupCallForAccount(
	accountManager: AccountManager,
	account: Account,
	model: Model<"openai-codex-responses">,
	provider: ReturnType<typeof getApiProvider>,
): Promise<void> {
	if (!provider) return;
	if (account.needsReauth) return;

	const token = await accountManager.ensureValidToken(account);
	const abortController = new AbortController();
	const timeout = setTimeout(() => abortController.abort(), WARMUP_TIMEOUT_MS);
	timeout.unref?.();

	try {
		const stream = provider.streamSimple(
			{
				...model,
				provider: "openai-codex",
				api: "openai-codex-responses",
				headers: {
					...(model.headers || {}),
					"X-Multicodex-Account": account.email,
					"X-Multicodex-Warmup": "1",
				},
			},
			createWarmupContext(),
			{
				apiKey: token,
				maxRetries: 0,
				maxTokens: WARMUP_MAX_TOKENS,
				reasoning: "minimal",
				signal: abortController.signal,
				timeoutMs: WARMUP_TIMEOUT_MS,
				transport: "sse",
			},
		);

		for await (const event of stream) {
			if (event.type === "error") {
				const message = event.error.errorMessage || "";
				if (isQuotaErrorMessage(message)) {
					await accountManager.handleQuotaExceeded(account);
				}
				return;
			}
			if (event.type === "done") return;
		}
	} finally {
		clearTimeout(timeout);
	}
}

export async function warmupLimitsForAllAccounts(
	accountManager: AccountManager,
): Promise<void> {
	const model = getWarmupModel();
	const provider = getApiProvider("openai-codex-responses");
	if (!model || !provider) return;

	for (const account of accountManager.getAccounts()) {
		try {
			await runWarmupCallForAccount(accountManager, account, model, provider);
		} catch {
			// Warmup is opportunistic. Real request rotation and explicit refresh flows
			// still surface actionable auth/quota errors to the user.
		}
	}

	await accountManager.refreshUsageForAllAccounts({ force: true });
}
