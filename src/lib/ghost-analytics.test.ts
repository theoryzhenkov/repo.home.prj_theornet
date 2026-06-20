import { afterEach, describe, expect, it } from 'bun:test';
import { ghostStatsConfigFromSite } from './ghost-analytics';

const ENV_KEYS = [
  'GHOST_STATS_ENDPOINT',
  'GHOST_STATS_SCRIPT_URL',
  'GHOST_STATS_DATASOURCE',
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<typeof ENV_KEYS[number], string | undefined>;

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  restoreEnv();
});

describe('ghostStatsConfigFromSite', () => {
  it('builds Ghost stats script configuration for a Ghost resource', () => {
    process.env.GHOST_STATS_ENDPOINT = '/.ghost/analytics/api/v1/page_hit';
    process.env.GHOST_STATS_SCRIPT_URL = 'https://ghost.example/public/ghost-stats.min.js';
    process.env.GHOST_STATS_DATASOURCE = 'analytics_events';

    expect(ghostStatsConfigFromSite(
      { site_uuid: 'site-uuid-1' },
      { postUuid: 'post-uuid-1', postType: 'post' },
    )).toEqual({
      scriptUrl: 'https://ghost.example/public/ghost-stats.min.js',
      endpoint: '/.ghost/analytics/api/v1/page_hit',
      siteUuid: 'site-uuid-1',
      postUuid: 'post-uuid-1',
      postType: 'post',
      datasource: 'analytics_events',
    });
  });

  it('does not emit config until the endpoint, site UUID, and post UUID are available', () => {
    process.env.GHOST_STATS_ENDPOINT = '/.ghost/analytics/api/v1/page_hit';

    expect(ghostStatsConfigFromSite(undefined, { postUuid: 'post-uuid-1', postType: 'post' })).toBeUndefined();
    expect(ghostStatsConfigFromSite({ site_uuid: 'site-uuid-1' }, undefined)).toBeUndefined();
    expect(ghostStatsConfigFromSite({ site_uuid: 'site-uuid-1' }, { postType: 'post' })).toBeUndefined();

    delete process.env.GHOST_STATS_ENDPOINT;
    expect(ghostStatsConfigFromSite(
      { site_uuid: 'site-uuid-1' },
      { postUuid: 'post-uuid-1', postType: 'post' },
    )).toBeUndefined();
  });
});
