import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
export const GET: APIRoute = async () => {
  const pages = await getCollection('pages');

  const index: Record<string, {
    title: string;
    description?: string;
    maturity?: string;
  }> = {};

  for (const page of pages) {
    // Keys use no trailing slash to match client-side path normalization
    const path = page.id === 'index' ? '/' : `/${page.id}`;
    index[path] = {
      title: page.data.title,
      description: page.data.description,
      maturity: page.data.maturity,
    };
  }
  
  return new Response(JSON.stringify(index, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
