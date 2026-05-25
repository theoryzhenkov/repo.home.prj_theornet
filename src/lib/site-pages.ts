import { getCollection } from 'astro:content';
import { filterGhostEntriesForLocalSlugs, getGhostHomeEntries, type GhostHomeEntry } from './ghost';
import type { PageInput } from './relations';

export async function getLocalPageSlugs(): Promise<Set<string>> {
  const localPages = await getCollection('pages');
  return new Set(localPages.map((page) => page.id));
}

export async function getGhostRouteEntries(): Promise<GhostHomeEntry[]> {
  const localSlugs = await getLocalPageSlugs();
  const ghostEntries = await getGhostHomeEntries();
  return filterGhostEntriesForLocalSlugs(ghostEntries, localSlugs);
}

export async function getGhostRouteEntry(slug: string): Promise<GhostHomeEntry | undefined> {
  const ghostEntries = await getGhostRouteEntries();
  return ghostEntries.find((entry) => entry.id === slug);
}

export async function getAllSitePageInputs(): Promise<PageInput[]> {
  const localPages = await getCollection('pages');
  const localSlugs = new Set(localPages.map((page) => page.id));
  const ghostEntries = filterGhostEntriesForLocalSlugs(await getGhostHomeEntries(), localSlugs);
  return [...localPages, ...ghostEntries] as PageInput[];
}
