import * as fs from "node:fs";
import * as path from "node:path";
import { getAgentPath } from "pi-provider-utils/agent-paths";

export interface Account {
	email: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	accountId?: string;
	lastUsed?: number;
	quotaExhaustedUntil?: number;
	needsReauth?: boolean;
}

function stripLegacyImportFields(account: Record<string, unknown>): void {
	for (const key of ["importSource", "importMode", "importFingerprint"]) {
		if (key in account) {
			delete account[key];
		}
	}
}

export interface StorageData {
	accounts: Account[];
	activeEmail?: string;
}

export const STORAGE_FILE = getAgentPath("codex-accounts.json");

export function loadStorage(): StorageData {
	try {
		if (fs.existsSync(STORAGE_FILE)) {
			const data = JSON.parse(
				fs.readFileSync(STORAGE_FILE, "utf-8"),
			) as StorageData;
			let migrated = false;
			for (const account of data.accounts) {
				const raw = account as unknown as Record<string, unknown>;
				if (
					"importSource" in raw ||
					"importMode" in raw ||
					"importFingerprint" in raw
				) {
					stripLegacyImportFields(raw);
					migrated = true;
				}
			}
			if (migrated) {
				saveStorage(data);
			}
			return data;
		}
	} catch (error) {
		console.error("Failed to load multicodex accounts:", error);
	}

	return { accounts: [] };
}

export function saveStorage(data: StorageData): void {
	try {
		const dir = path.dirname(STORAGE_FILE);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
	} catch (error) {
		console.error("Failed to save multicodex accounts:", error);
	}
}
