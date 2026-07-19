/**
 * Cloudflare API helpers for fetching build data.
 */

import type {
	Env,
	CloudflareEvent,
	BuildDetailsResponse,
	CustomDomainsResponse,
	SubdomainResponse,
	LogsResponse,
} from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Maximum pages to fetch for logs (prevents infinite loops) */
const MAX_LOG_PAGES = 50;

// =============================================================================
// BUILD URLS
// =============================================================================

/**
 * Returns the first Custom Domain attached to a Worker.
 * A lookup failure is non-fatal because callers can use the workers.dev URL.
 */
async function fetchCustomDomainUrl(
	accountId: string,
	workerName: string,
	apiToken: string,
): Promise<string | null> {
	try {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains?service=${encodeURIComponent(workerName)}`,
			{
				headers: { Authorization: `Bearer ${apiToken}` },
			},
		);

		if (!response.ok) {
			return null;
		}

		const data: CustomDomainsResponse = await response.json();
		const hostname = data.result
			?.find((domain) => domain.hostname?.trim())
			?.hostname?.trim();

		return hostname ? `https://${hostname}/` : null;
	} catch (error) {
		console.warn("Failed to fetch Custom Domains:", error);
		return null;
	}
}

/**
 * Fetches preview/live URLs for a successful build.
 */
export async function fetchBuildUrls(
	event: CloudflareEvent,
	env: Env,
): Promise<{ previewUrl: string | null; liveUrl: string | null }> {
	const workerName =
		event.source?.workerName || event.payload.buildTriggerMetadata?.repoName;
	const accountId = event.metadata.accountId;

	if (!workerName || !accountId || !env.CLOUDFLARE_API_TOKEN) {
		return { previewUrl: null, liveUrl: null };
	}

	try {
		// Try to get preview URL from build details
		const buildRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/builds/builds/${event.payload.buildUuid}`,
			{
				headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
			},
		);
		const buildData: BuildDetailsResponse = await buildRes.json();

		if (buildData.result?.preview_url) {
			return { previewUrl: buildData.result.preview_url, liveUrl: null };
		}

		const customDomainUrl = await fetchCustomDomainUrl(
			accountId,
			workerName,
			env.CLOUDFLARE_API_TOKEN,
		);

		if (customDomainUrl) {
			return { previewUrl: null, liveUrl: customDomainUrl };
		}

		// Fall back to constructing the workers.dev URL from the account subdomain.
		const subRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
			{
				headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
			},
		);
		const subData: SubdomainResponse = await subRes.json();

		if (subData.result?.subdomain) {
			return {
				previewUrl: null,
				liveUrl: `https://${workerName}.${subData.result.subdomain}.workers.dev`,
			};
		}
	} catch (error) {
		console.error("Failed to fetch URLs:", error);
	}

	return { previewUrl: null, liveUrl: null };
}

// =============================================================================
// BUILD LOGS
// =============================================================================

/**
 * Fetches build logs for a failed build.
 * Handles pagination automatically.
 */
export async function fetchBuildLogs(
	event: CloudflareEvent,
	env: Env,
): Promise<string[]> {
	const accountId = event.metadata.accountId;

	if (!accountId || !env.CLOUDFLARE_API_TOKEN) {
		return [];
	}

	const logs: string[] = [];

	try {
		let cursor: string | null = null;
		let pageCount = 0;

		do {
			const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/builds/builds/${event.payload.buildUuid}/logs${cursor ? `?cursor=${cursor}` : ""}`;

			const res = await fetch(endpoint, {
				headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
			});
			const data: LogsResponse = await res.json();

			if (data.result?.lines && data.result.lines.length > 0) {
				logs.push(...data.result.lines.map((l) => l[1]));
			}

			cursor = data.result?.truncated ? (data.result?.cursor ?? null) : null;
			pageCount++;
		} while (cursor && pageCount < MAX_LOG_PAGES);

		if (pageCount >= MAX_LOG_PAGES) {
			console.warn(
				`Reached max log pages (${MAX_LOG_PAGES}) for build ${event.payload.buildUuid}`,
			);
		}
	} catch (error) {
		console.error("Failed to fetch logs:", error);
	}

	return logs;
}
