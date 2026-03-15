import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { AccountManager } from "./account-manager";
import { registerCommands } from "./commands";
import { handleNewSessionSwitch, handleSessionStart } from "./hooks";
import { buildMulticodexProviderConfig, PROVIDER_ID } from "./provider";

export default function multicodexExtension(pi: ExtensionAPI) {
	const accountManager = new AccountManager();
	let lastContext: ExtensionContext | undefined;

	accountManager.setWarningHandler((message) => {
		if (lastContext) {
			lastContext.ui.notify(message, "warning");
		}
	});

	pi.registerProvider(
		PROVIDER_ID,
		buildMulticodexProviderConfig(accountManager),
	);

	registerCommands(pi, accountManager);

	pi.on("session_start", (_event: unknown, ctx: ExtensionContext) => {
		lastContext = ctx;
		handleSessionStart(accountManager);
	});

	pi.on(
		"session_switch",
		(event: { reason?: string }, ctx: ExtensionContext) => {
			lastContext = ctx;
			if (event.reason === "new") {
				handleNewSessionSwitch(accountManager);
			}
		},
	);
}
