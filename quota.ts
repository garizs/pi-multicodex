export function isQuotaErrorMessage(message: string): boolean {
	return /\b429\b|quota|usage limit|rate.?limit|too many requests|limit reached|limit exceeded|plan exceeded|free plan/i.test(
		message,
	);
}
