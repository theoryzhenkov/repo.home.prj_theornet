const DEFAULT_GHOST_SITE_API_URL = 'https://ghost.theor.net/ghost/api/admin/site/';
const DEFAULT_GHOST_STATS_SCRIPT_URL = 'https://ghost.theor.net/public/ghost-stats.min.js';

export type GhostStatsPostType = 'post' | 'page';

export interface GhostStatsSite {
  site_uuid?: string;
}

interface GhostStatsSiteResponse {
  site?: GhostStatsSite;
}

export interface GhostStatsResource {
  postUuid?: string;
  postType: GhostStatsPostType;
}

export interface GhostStatsScriptConfig {
  scriptUrl: string;
  endpoint: string;
  siteUuid: string;
  postUuid: string;
  postType: GhostStatsPostType;
  datasource?: string;
}

let ghostStatsSiteCache: Promise<GhostStatsSite | undefined> | null = null;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function ghostStatsSiteApiUrl(): string {
  return env('GHOST_STATS_SITE_API_URL') ?? DEFAULT_GHOST_SITE_API_URL;
}

function ghostStatsScriptUrl(): string {
  return env('GHOST_STATS_SCRIPT_URL') ?? DEFAULT_GHOST_STATS_SCRIPT_URL;
}

function ghostStatsEndpoint(): string | undefined {
  return env('GHOST_STATS_ENDPOINT');
}

function ghostStatsDatasource(): string | undefined {
  return env('GHOST_STATS_DATASOURCE');
}

export async function fetchGhostStatsSite(): Promise<GhostStatsSite | undefined> {
  const response = await fetch(ghostStatsSiteApiUrl(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Ghost site API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as GhostStatsSiteResponse;
  return payload.site;
}

export async function getGhostStatsSite(): Promise<GhostStatsSite | undefined> {
  if (ghostStatsSiteCache) return ghostStatsSiteCache;

  ghostStatsSiteCache = fetchGhostStatsSite();
  return ghostStatsSiteCache;
}

export function ghostStatsConfigFromSite(
  site: GhostStatsSite | undefined,
  resource: GhostStatsResource | undefined,
): GhostStatsScriptConfig | undefined {
  const endpoint = ghostStatsEndpoint();
  if (!endpoint || !site?.site_uuid || !resource?.postUuid) return undefined;

  return {
    scriptUrl: ghostStatsScriptUrl(),
    endpoint,
    siteUuid: site.site_uuid,
    postUuid: resource.postUuid,
    postType: resource.postType,
    ...(ghostStatsDatasource() ? { datasource: ghostStatsDatasource() } : {}),
  };
}

export async function getGhostStatsConfig(
  resource: GhostStatsResource | undefined,
): Promise<GhostStatsScriptConfig | undefined> {
  if (!ghostStatsEndpoint() || !resource?.postUuid) return undefined;

  const site = await getGhostStatsSite();
  return ghostStatsConfigFromSite(site, resource);
}
