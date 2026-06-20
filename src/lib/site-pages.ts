import { getGhostHomeEntries, type GhostHomeEntry } from './ghost';
import type { PageInput } from './relations';

export async function getLocalPages(): Promise<[]> {
  return [];
}

export async function getLocalPageSlugs(): Promise<Set<string>> {
  return new Set();
}

export async function getGhostRouteEntries(): Promise<GhostHomeEntry[]> {
  return getGhostHomeEntries();
}

export async function getGhostRouteEntry(slug: string): Promise<GhostHomeEntry | undefined> {
  const ghostEntries = await getGhostRouteEntries();
  return ghostEntries.find((entry) => entry.id === slug);
}

export async function getAllSitePageInputs(): Promise<PageInput[]> {
  return await getGhostHomeEntries() as PageInput[];
}
