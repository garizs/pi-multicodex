import { describe, expect, it, vi } from "vitest";
import {
	handleNewSessionSwitch,
	handleSessionStart,
	handleUsageRefresh,
} from "./hooks";

describe("handleSessionStart", () => {
	it("loads pi auth on startup even when no persisted accounts exist", async () => {
		let accounts: Array<{ email: string }> = [];
		const loadPiAuth = vi.fn().mockImplementation(async () => {
			accounts = [{ email: "pi@example.com" }];
		});
		const refreshUsageForAllAccounts = vi.fn().mockResolvedValue(undefined);
		const getAvailableManualAccount = vi.fn().mockReturnValue(undefined);
		const hasManualAccount = vi.fn().mockReturnValue(false);
		const clearManualAccount = vi.fn();
		const activateBestAccount = vi.fn().mockResolvedValue(undefined);
		const beginInitialization = vi.fn();
		const markReady = vi.fn();

		handleSessionStart({
			getAccounts: () => accounts,
			loadPiAuth,
			isPiAuthAccount: () => true,
			refreshUsageForAllAccounts,
			getAccountsNeedingReauth: () => [],
			getAvailableManualAccount,
			hasManualAccount,
			clearManualAccount,
			activateBestAccount,
			beginInitialization,
			markReady,
		} as never);

		await vi.waitFor(() => {
			expect(beginInitialization).toHaveBeenCalled();
			expect(loadPiAuth).toHaveBeenCalled();
			expect(refreshUsageForAllAccounts).toHaveBeenCalledWith({ force: true });
			expect(activateBestAccount).toHaveBeenCalled();
			expect(markReady).toHaveBeenCalled();
		});
	});

	it("marks ready without refreshing when no account exists after pi auth load", async () => {
		const loadPiAuth = vi.fn().mockResolvedValue(undefined);
		const refreshUsageForAllAccounts = vi.fn();
		const beginInitialization = vi.fn();
		const markReady = vi.fn();

		handleSessionStart({
			getAccounts: () => [],
			loadPiAuth,
			refreshUsageForAllAccounts,
			getAccountsNeedingReauth: () => [],
			getAvailableManualAccount: vi.fn(),
			hasManualAccount: vi.fn(),
			clearManualAccount: vi.fn(),
			activateBestAccount: vi.fn(),
			beginInitialization,
			markReady,
		} as never);

		await vi.waitFor(() => {
			expect(beginInitialization).toHaveBeenCalled();
			expect(loadPiAuth).toHaveBeenCalled();
			expect(refreshUsageForAllAccounts).not.toHaveBeenCalled();
			expect(markReady).toHaveBeenCalled();
		});
	});

	it("refreshes and activates when accounts exist and no manual account is available", async () => {
		const loadPiAuth = vi.fn().mockResolvedValue(undefined);
		const refreshUsageForAllAccounts = vi.fn().mockResolvedValue(undefined);
		const getAvailableManualAccount = vi.fn().mockReturnValue(undefined);
		const hasManualAccount = vi.fn().mockReturnValue(false);
		const clearManualAccount = vi.fn();
		const activateBestAccount = vi.fn().mockResolvedValue(undefined);
		const beginInitialization = vi.fn();
		const markReady = vi.fn();

		handleSessionStart({
			getAccounts: () => [{ email: "a@example.com" }],
			loadPiAuth,
			isPiAuthAccount: () => false,
			refreshUsageForAllAccounts,
			getAccountsNeedingReauth: () => [],
			getAvailableManualAccount,
			hasManualAccount,
			clearManualAccount,
			activateBestAccount,
			beginInitialization,
			markReady,
		} as never);

		await vi.waitFor(() => {
			expect(beginInitialization).toHaveBeenCalled();
			expect(loadPiAuth).toHaveBeenCalled();
			expect(refreshUsageForAllAccounts).toHaveBeenCalledWith({ force: true });
			expect(getAvailableManualAccount).toHaveBeenCalled();
			expect(hasManualAccount).toHaveBeenCalled();
			expect(clearManualAccount).not.toHaveBeenCalled();
			expect(activateBestAccount).toHaveBeenCalled();
			expect(markReady).toHaveBeenCalled();
		});
	});

	it("keeps the manual account when one is available", async () => {
		const loadPiAuth = vi.fn().mockResolvedValue(undefined);
		const refreshUsageForAllAccounts = vi.fn().mockResolvedValue(undefined);
		const getAvailableManualAccount = vi
			.fn()
			.mockReturnValue({ email: "manual@example.com" });
		const hasManualAccount = vi.fn();
		const clearManualAccount = vi.fn();
		const activateBestAccount = vi.fn();
		const beginInitialization = vi.fn();
		const markReady = vi.fn();

		handleSessionStart({
			getAccounts: () => [{ email: "manual@example.com" }],
			loadPiAuth,
			isPiAuthAccount: () => false,
			refreshUsageForAllAccounts,
			getAccountsNeedingReauth: () => [],
			getAvailableManualAccount,
			hasManualAccount,
			clearManualAccount,
			activateBestAccount,
			beginInitialization,
			markReady,
		} as never);

		await vi.waitFor(() => {
			expect(beginInitialization).toHaveBeenCalled();
			expect(loadPiAuth).toHaveBeenCalled();
			expect(refreshUsageForAllAccounts).toHaveBeenCalledWith({ force: true });
			expect(getAvailableManualAccount).toHaveBeenCalled();
			expect(hasManualAccount).not.toHaveBeenCalled();
			expect(clearManualAccount).not.toHaveBeenCalled();
			expect(activateBestAccount).not.toHaveBeenCalled();
			expect(markReady).toHaveBeenCalled();
		});
	});
});

describe("handleUsageRefresh", () => {
	it("refreshes all account usage without forcing cache bypass", async () => {
		const loadPiAuth = vi.fn().mockResolvedValue(undefined);
		const refreshUsageForAllAccounts = vi.fn().mockResolvedValue(undefined);

		handleUsageRefresh({
			getAccounts: () => [{ email: "a@example.com" }],
			loadPiAuth,
			refreshUsageForAllAccounts,
		} as never);

		await vi.waitFor(() => {
			expect(loadPiAuth).toHaveBeenCalled();
			expect(refreshUsageForAllAccounts).toHaveBeenCalledWith(undefined);
		});
	});
});

describe("handleNewSessionSwitch", () => {
	it("refreshes and clears stale manual state before activating the best account", async () => {
		const loadPiAuth = vi.fn().mockResolvedValue(undefined);
		const refreshUsageForAllAccounts = vi.fn().mockResolvedValue(undefined);
		const getAvailableManualAccount = vi.fn().mockReturnValue(undefined);
		const hasManualAccount = vi.fn().mockReturnValue(true);
		const clearManualAccount = vi.fn();
		const activateBestAccount = vi.fn().mockResolvedValue(undefined);
		const beginInitialization = vi.fn();
		const markReady = vi.fn();

		handleNewSessionSwitch({
			getAccounts: () => [{ email: "a@example.com" }],
			loadPiAuth,
			isPiAuthAccount: () => false,
			refreshUsageForAllAccounts,
			getAccountsNeedingReauth: () => [],
			getAvailableManualAccount,
			hasManualAccount,
			clearManualAccount,
			activateBestAccount,
			beginInitialization,
			markReady,
		} as never);

		await vi.waitFor(() => {
			expect(beginInitialization).toHaveBeenCalled();
			expect(loadPiAuth).toHaveBeenCalled();
			expect(refreshUsageForAllAccounts).toHaveBeenCalledWith({ force: true });
			expect(getAvailableManualAccount).toHaveBeenCalled();
			expect(hasManualAccount).toHaveBeenCalled();
			expect(clearManualAccount).toHaveBeenCalled();
			expect(activateBestAccount).toHaveBeenCalled();
			expect(markReady).toHaveBeenCalled();
		});
	});

	it("marks ready even when the refresh throws", async () => {
		const loadPiAuth = vi.fn().mockRejectedValue(new Error("network failure"));
		const beginInitialization = vi.fn();
		const markReady = vi.fn();

		handleNewSessionSwitch({
			loadPiAuth,
			isPiAuthAccount: () => false,
			refreshUsageForAllAccounts: vi.fn(),
			getAccountsNeedingReauth: () => [],
			getAvailableManualAccount: vi.fn(),
			hasManualAccount: vi.fn(),
			clearManualAccount: vi.fn(),
			activateBestAccount: vi.fn(),
			beginInitialization,
			markReady,
		} as never);

		await vi.waitFor(() => {
			expect(markReady).toHaveBeenCalled();
		});
	});
});
