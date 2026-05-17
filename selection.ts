import type { Account } from "./storage";
import { type CodexUsageSnapshot, getMaxUsedPercent } from "./usage";

export function isAccountAvailable(account: Account, now: number): boolean {
	if (account.needsReauth) return false;
	return !account.quotaExhaustedUntil || account.quotaExhaustedUntil <= now;
}

function isUsageExhausted(usage: CodexUsageSnapshot | undefined): boolean {
	const usedPercent = getMaxUsedPercent(usage);
	return usedPercent !== undefined && usedPercent >= 100;
}

function rotateFromActive(
	accounts: Account[],
	activeEmail: string | undefined,
): Account[] {
	if (!activeEmail) return accounts;
	const activeIndex = accounts.findIndex(
		(account) => account.email === activeEmail,
	);
	if (activeIndex < 0) return accounts;
	return [...accounts.slice(activeIndex), ...accounts.slice(0, activeIndex)];
}

export function pickBestAccount(
	accounts: Account[],
	usageByEmail: Map<string, CodexUsageSnapshot>,
	options?: { activeEmail?: string; excludeEmails?: Set<string>; now?: number },
): Account | undefined {
	const now = options?.now ?? Date.now();
	const ordered = rotateFromActive(accounts, options?.activeEmail);
	return ordered.find(
		(account) =>
			isAccountAvailable(account, now) &&
			!options?.excludeEmails?.has(account.email) &&
			!isUsageExhausted(usageByEmail.get(account.email)),
	);
}
