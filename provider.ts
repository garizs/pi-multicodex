import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getApiProvider, getModels } from "@earendil-works/pi-ai";
import type { AccountManager } from "./account-manager";
import { createStreamWrapper } from "./stream-wrapper";

export const PROVIDER_ID = "openai-codex";

export interface ProviderModelDef {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
	};
	contextWindow: number;
	maxTokens: number;
}

type OpenAICodexModelOverride = Partial<
	Pick<
		ProviderModelDef,
		"name" | "reasoning" | "input" | "cost" | "contextWindow" | "maxTokens"
	>
>;

function getAgentDir(): string {
	return process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
}

function readOpenAICodexModelOverrides(): Map<
	string,
	OpenAICodexModelOverride
> {
	const modelsJsonPath = join(getAgentDir(), "models.json");
	if (!existsSync(modelsJsonPath)) {
		return new Map();
	}
	try {
		const parsed = JSON.parse(readFileSync(modelsJsonPath, "utf-8")) as {
			providers?: {
				"openai-codex"?: {
					modelOverrides?: Record<string, OpenAICodexModelOverride>;
				};
			};
		};
		return new Map(
			Object.entries(parsed.providers?.["openai-codex"]?.modelOverrides ?? {}),
		);
	} catch {
		return new Map();
	}
}

function applyOpenAICodexOverride(
	model: ProviderModelDef,
	override: OpenAICodexModelOverride | undefined,
): ProviderModelDef {
	if (!override) {
		return model;
	}
	return {
		...model,
		name: override.name ?? model.name,
		reasoning: override.reasoning ?? model.reasoning,
		input: override.input ? [...override.input] : model.input,
		cost: override.cost
			? {
					input: override.cost.input ?? model.cost.input,
					output: override.cost.output ?? model.cost.output,
					cacheRead: override.cost.cacheRead ?? model.cost.cacheRead,
					cacheWrite: override.cost.cacheWrite ?? model.cost.cacheWrite,
				}
			: model.cost,
		contextWindow: override.contextWindow ?? model.contextWindow,
		maxTokens: override.maxTokens ?? model.maxTokens,
	};
}

export function getOpenAICodexMirror(): {
	baseUrl: string;
	models: ProviderModelDef[];
} {
	const models = getModels("openai-codex");
	const first = models[0];
	if (!first) {
		return { baseUrl: "https://chatgpt.com/backend-api", models: [] };
	}
	const overrides = readOpenAICodexModelOverrides();
	return {
		baseUrl: first.baseUrl ?? "",
		models: models.map((m) =>
			applyOpenAICodexOverride(
				{
					id: m.id,
					name: m.name,
					reasoning: m.reasoning,
					input: [...m.input],
					cost: { ...m.cost },
					contextWindow: m.contextWindow,
					maxTokens: m.maxTokens,
				},
				overrides.get(m.id),
			),
		),
	};
}

export function getActiveApiKey(accountManager: AccountManager): string {
	const active = accountManager.getActiveAccount();
	if (active && !active.needsReauth) {
		return active.accessToken;
	}
	// Fallback: first available account with a valid token.
	for (const account of accountManager.getAccounts()) {
		if (!account.needsReauth && account.accessToken) {
			return account.accessToken;
		}
	}
	// Fallback placeholder until MultiCodex resolves a usable managed account.
	return "pending-login";
}

export function buildMulticodexProviderConfig(accountManager: AccountManager) {
	const mirror = getOpenAICodexMirror();
	const baseProvider = getApiProvider("openai-codex-responses");
	if (!baseProvider) {
		throw new Error(
			"OpenAI Codex provider not available. Please update pi to include openai-codex support.",
		);
	}

	return {
		baseUrl: mirror.baseUrl,
		apiKey: getActiveApiKey(accountManager),
		api: "openai-codex-responses" as const,
		streamSimple: createStreamWrapper(accountManager, baseProvider),
		models: mirror.models,
	};
}
