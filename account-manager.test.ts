import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	storageData: {
		accounts: [] as Array<Record<string, unknown>>,
		activeEmail: undefined as string | undefined,
	},
	loadImportedOpenAICodexAuth: vi.fn(),
	saveStorage: vi.fn(),
	writeActiveTokenToAuthJson: vi.fn(),
}));

vi.mock("./storage", () => ({
	loadStorage: () =>
		JSON.parse(JSON.stringify(mocks.storageData)) as {
			accounts: Array<Record<string, unknown>>;
			activeEmail?: string;
		},
	saveStorage: mocks.saveStorage,
}));

vi.mock("./auth", () => ({
	loadImportedOpenAICodexAuth: mocks.loadImportedOpenAICodexAuth,
	writeActiveTokenToAuthJson: mocks.writeActiveTokenToAuthJson,
}));

vi.mock("@mariozechner/pi-ai/oauth", () => ({
	refreshOpenAICodexToken: vi.fn(),
}));

import { AccountManager } from "./account-manager";

describe("AccountManager account deduplication", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.storageData.accounts = [];
		mocks.storageData.activeEmail = undefined;
		mocks.loadImportedOpenAICodexAuth.mockResolvedValue(undefined);
	});

	it("merges imported auth into an existing managed account without changing the active selection", async () => {
		mocks.storageData.accounts = [
			{
				email: "manual@example.com",
				accessToken: "manual-access",
				refreshToken: "shared-refresh",
				expiresAt: 100,
				accountId: "acc-123",
			},
			{
				email: "OpenAI Codex acc-123",
				accessToken: "imported-access",
				refreshToken: "shared-refresh",
				expiresAt: 90,
				accountId: "acc-123",
				importSource: "pi-openai-codex",
				importFingerprint: "old-fingerprint",
			},
		];
		mocks.storageData.activeEmail = "manual@example.com";
		mocks.loadImportedOpenAICodexAuth.mockResolvedValue({
			identifier: "OpenAI Codex acc-123",
			fingerprint: "new-fingerprint",
			credentials: {
				access: "fresh-access",
				refresh: "shared-refresh",
				expires: 200,
				accountId: "acc-123",
			},
		});

		const manager = new AccountManager();
		const changed = await manager.syncImportedOpenAICodexAuth();

		expect(changed).toBe(true);
		expect(manager.getAccounts()).toHaveLength(1);
		const account = manager.getAccount("manual@example.com");
		expect(account).toMatchObject({
			email: "manual@example.com",
			accessToken: "fresh-access",
			refreshToken: "shared-refresh",
			expiresAt: 200,
			importSource: "pi-openai-codex",
			importFingerprint: "new-fingerprint",
		});
		expect(manager.getAccount("OpenAI Codex acc-123")).toBeUndefined();
		expect(manager.getActiveAccount()?.email).toBe("manual@example.com");
	});

	it("reuses an imported placeholder account when the same credentials are added with a real label", () => {
		mocks.storageData.accounts = [
			{
				email: "OpenAI Codex acc-123",
				accessToken: "old-access",
				refreshToken: "shared-refresh",
				expiresAt: 100,
				accountId: "acc-123",
				importSource: "pi-openai-codex",
				importFingerprint: "fingerprint",
			},
		];

		const manager = new AccountManager();
		const account = manager.addOrUpdateAccount("real@example.com", {
			access: "new-access",
			refresh: "shared-refresh",
			expires: 300,
			accountId: "acc-123",
		});

		expect(account.email).toBe("real@example.com");
		expect(manager.getAccounts()).toHaveLength(1);
		expect(manager.getAccount("OpenAI Codex acc-123")).toBeUndefined();
		expect(manager.getAccount("real@example.com")).toMatchObject({
			email: "real@example.com",
			accessToken: "new-access",
			refreshToken: "shared-refresh",
			expiresAt: 300,
			importSource: "pi-openai-codex",
		});
		expect(manager.getActiveAccount()?.email).toBe("real@example.com");
	});
});
