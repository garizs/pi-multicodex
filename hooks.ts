import type { AccountManager } from "./account-manager";
import { warmupLimitsForAllAccounts } from "./warmup";

type WarningHandler = (message: string) => void;

async function refreshUsageForAllAccounts(
	accountManager: AccountManager,
	options?: { force?: boolean },
): Promise<void> {
	await accountManager.loadPiAuth();
	if (accountManager.getAccounts().length === 0) return;
	await accountManager.refreshUsageForAllAccounts(options);
}

function warnAboutReauthAccounts(
	accountManager: AccountManager,
	warningHandler?: WarningHandler,
): void {
	const needsReauth = accountManager.getAccountsNeedingReauth();
	if (needsReauth.length === 0) return;

	const hints = needsReauth.map((a) => {
		const cmd = accountManager.isPiAuthAccount(a)
			? "/login openai-codex"
			: `/multicodex use ${a.email}`;
		return `${a.email} (${cmd})`;
	});
	warningHandler?.(
		`Multicodex: ${needsReauth.length} account(s) need re-authentication: ${hints.join(", ")}`,
	);
}

async function warmupAndActivateBestAccount(
	accountManager: AccountManager,
	warningHandler?: WarningHandler,
): Promise<void> {
	let hasAccounts = false;
	accountManager.beginInitialization();
	try {
		await refreshUsageForAllAccounts(accountManager, { force: true });
		hasAccounts = accountManager.getAccounts().length > 0;
		if (hasAccounts) {
			warnAboutReauthAccounts(accountManager, warningHandler);

			const manual = accountManager.getAvailableManualAccount();
			if (!manual) {
				if (accountManager.hasManualAccount()) {
					accountManager.clearManualAccount();
				}
				await accountManager.activateBestAccount();
			}
		}
	} finally {
		accountManager.markReady();
	}

	if (hasAccounts) {
		warmupLimitsForAllAccounts(accountManager).catch(() => {});
	}
}

export function handleSessionStart(
	accountManager: AccountManager,
	warningHandler?: WarningHandler,
): void {
	warmupAndActivateBestAccount(accountManager, warningHandler).catch(() => {});
}

export function handleNewSessionSwitch(
	accountManager: AccountManager,
	warningHandler?: WarningHandler,
): void {
	warmupAndActivateBestAccount(accountManager, warningHandler).catch(() => {});
}

export function handleUsageRefresh(accountManager: AccountManager): void {
	refreshUsageForAllAccounts(accountManager).catch(() => {});
}
