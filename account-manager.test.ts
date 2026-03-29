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
				importMode: "synthetic",
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
			importMode: "linked",
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
				importMode: "synthetic",
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
			importMode: "linked",
		});
		expect(manager.getActiveAccount()?.email).toBe("real@example.com");
	});

	it("renames synthetic imported accounts when a real email can now be derived", async () => {
		mocks.storageData.accounts = [
			{
				email: "OpenAI Codex acc-123",
				accessToken: "old-access",
				refreshToken: "shared-refresh",
				expiresAt: 100,
				accountId: "acc-123",
				importSource: "pi-openai-codex",
				importMode: "synthetic",
				importFingerprint: JSON.stringify({
					access:
						"eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJ2aWN0b3IuYXJhdWpvMTA1QGdtYWlsLmNvbSJ9fQ.sig",
					refresh: "shared-refresh",
					expires: 100,
					accountId: "acc-123",
				}),
			},
		];
		mocks.loadImportedOpenAICodexAuth.mockResolvedValue({
			identifier: "victor.araujo105@gmail.com",
			fingerprint: JSON.stringify({
				access:
					"eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJ2aWN0b3IuYXJhdWpvMTA1QGdtYWlsLmNvbSJ9fQ.sig",
				refresh: "shared-refresh",
				expires: 100,
				accountId: "acc-123",
			}),
			credentials: {
				access:
					"eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJ2aWN0b3IuYXJhdWpvMTA1QGdtYWlsLmNvbSJ9fQ.sig",
				refresh: "shared-refresh",
				expires: 100,
				accountId: "acc-123",
			},
		});

		const manager = new AccountManager();
		const changed = await manager.syncImportedOpenAICodexAuth();

		expect(changed).toBe(true);
		expect(manager.getAccount("OpenAI Codex acc-123")).toBeUndefined();
		expect(manager.getAccount("victor.araujo105@gmail.com")).toMatchObject({
			email: "victor.araujo105@gmail.com",
			importSource: "pi-openai-codex",
			importMode: "synthetic",
		});
	});

	it("clears legacy imported links from the previous account when auth.json switches accounts", async () => {
		mocks.storageData.accounts = [
			{
				email: "victor.araujo105@gmail.com",
				accessToken: "gmail-access",
				refreshToken: "gmail-refresh",
				expiresAt: 100,
				importSource: "pi-openai-codex",
			},
			{
				email: "araujo.victor@alu.ufc.br",
				accessToken: "ufc-access",
				refreshToken: "ufc-refresh",
				expiresAt: 100,
			},
		];
		mocks.loadImportedOpenAICodexAuth.mockResolvedValue({
			identifier: "araujo.victor@alu.ufc.br",
			fingerprint: "ufc-fingerprint",
			credentials: {
				access: "ufc-access-new",
				refresh: "ufc-refresh",
				expires: 200,
			},
		});

		const manager = new AccountManager();
		const changed = await manager.syncImportedOpenAICodexAuth();

		expect(changed).toBe(true);
		expect(manager.getAccount("victor.araujo105@gmail.com")).toMatchObject({
			email: "victor.araujo105@gmail.com",
			importSource: undefined,
		});
		expect(manager.getAccount("araujo.victor@alu.ufc.br")).toMatchObject({
			email: "araujo.victor@alu.ufc.br",
			accessToken: "ufc-access-new",
			importSource: "pi-openai-codex",
			importMode: "linked",
			importFingerprint: "ufc-fingerprint",
		});
	});

	it("keeps unrelated managed accounts when imported auth only matches one account", async () => {
		mocks.storageData.accounts = [
			{
				email: "victor@victor-software-house.com",
				accessToken: "victor-access",
				refreshToken: "victor-refresh",
				expiresAt: 100,
				needsReauth: true,
			},
			{
				email: "araujo.victor@alu.ufc.br",
				accessToken: "ufc-access",
				refreshToken: "ufc-refresh",
				expiresAt: 100,
				needsReauth: true,
			},
			{
				email: "OpenAI Codex ef5816db",
				accessToken: "imported-access",
				refreshToken: "gmail-refresh",
				expiresAt: 90,
				accountId: "gmail",
				importSource: "pi-openai-codex",
				importMode: "synthetic",
				importFingerprint: "old-fingerprint",
			},
		];
		mocks.loadImportedOpenAICodexAuth.mockResolvedValue({
			identifier: "victor.araujo105@gmail.com",
			fingerprint: "gmail-fingerprint",
			credentials: {
				access: "gmail-access",
				refresh: "gmail-refresh",
				expires: 200,
				accountId: "gmail",
			},
		});

		const manager = new AccountManager();
		const changed = await manager.syncImportedOpenAICodexAuth();

		expect(changed).toBe(true);
		expect(manager.getAccounts().map((account) => account.email)).toEqual([
			"victor@victor-software-house.com",
			"araujo.victor@alu.ufc.br",
			"victor.araujo105@gmail.com",
		]);
		expect(
			manager.getAccount("victor@victor-software-house.com"),
		).toMatchObject({
			email: "victor@victor-software-house.com",
			refreshToken: "victor-refresh",
			needsReauth: true,
		});
		expect(manager.getAccount("araujo.victor@alu.ufc.br")).toMatchObject({
			email: "araujo.victor@alu.ufc.br",
			refreshToken: "ufc-refresh",
			needsReauth: true,
		});
		expect(manager.getAccount("victor.araujo105@gmail.com")).toMatchObject({
			email: "victor.araujo105@gmail.com",
			refreshToken: "gmail-refresh",
			importSource: "pi-openai-codex",
			importMode: "synthetic",
		});
	});

	it("keeps previously linked managed accounts when imported auth moves to another account", async () => {
		mocks.storageData.accounts = [
			{
				email: "victor@example.com",
				accessToken: "victor-access",
				refreshToken: "victor-refresh",
				expiresAt: 100,
				accountId: "victor",
			},
			{
				email: "gmail@example.com",
				accessToken: "gmail-access",
				refreshToken: "gmail-refresh",
				expiresAt: 100,
				accountId: "gmail",
				importSource: "pi-openai-codex",
				importMode: "linked",
				importFingerprint: "gmail-fingerprint",
			},
		];
		mocks.storageData.activeEmail = "victor@example.com";
		mocks.loadImportedOpenAICodexAuth.mockResolvedValue({
			identifier: "OpenAI Codex victor",
			fingerprint: "victor-fingerprint",
			credentials: {
				access: "victor-new-access",
				refresh: "victor-refresh",
				expires: 200,
				accountId: "victor",
			},
		});

		const manager = new AccountManager();
		const changed = await manager.syncImportedOpenAICodexAuth();

		expect(changed).toBe(true);
		expect(manager.getAccounts()).toHaveLength(2);
		expect(manager.getAccount("gmail@example.com")).toMatchObject({
			email: "gmail@example.com",
			refreshToken: "gmail-refresh",
			importSource: undefined,
			importMode: undefined,
			importFingerprint: undefined,
		});
		expect(manager.getAccount("victor@example.com")).toMatchObject({
			email: "victor@example.com",
			accessToken: "victor-new-access",
			refreshToken: "victor-refresh",
			importSource: "pi-openai-codex",
			importMode: "linked",
			importFingerprint: "victor-fingerprint",
		});
	});
});

describe("AccountManager auth-failure warnings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.storageData.accounts = [];
		mocks.storageData.activeEmail = undefined;
		mocks.loadImportedOpenAICodexAuth.mockResolvedValue(undefined);
	});

	it("warns once per session for a skipped auth-broken account and resets on reauth", () => {
		const manager = new AccountManager();
		const warningHandler = vi.fn();
		manager.setWarningHandler(warningHandler);
		const account = manager.addOrUpdateAccount("warn@example.com", {
			access: "access",
			refresh: "refresh",
			expires: 100,
		});
		account.needsReauth = true;

		manager.notifyRotationSkipForAuthFailure(
			account,
			new Error("refresh failed"),
		);
		manager.notifyRotationSkipForAuthFailure(
			account,
			new Error("refresh failed"),
		);
		expect(warningHandler).toHaveBeenCalledTimes(1);
		expect(warningHandler.mock.calls[0]?.[0]).toContain("warn@example.com");
		expect(warningHandler.mock.calls[0]?.[0]).toContain(
			"/multicodex reauth warn@example.com",
		);

		manager.addOrUpdateAccount("warn@example.com", {
			access: "new-access",
			refresh: "refresh",
			expires: 200,
		});
		manager.notifyRotationSkipForAuthFailure(
			account,
			new Error("refresh failed again"),
		);
		expect(warningHandler).toHaveBeenCalledTimes(2);

		manager.resetSessionWarnings();
		manager.notifyRotationSkipForAuthFailure(
			account,
			new Error("refresh failed third"),
		);
		expect(warningHandler).toHaveBeenCalledTimes(3);
	});
});
