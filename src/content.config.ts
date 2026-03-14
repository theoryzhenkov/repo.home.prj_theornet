import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const relationEntry = z.object({
  page: z.string(),
  label: z.string().optional(),
});
const relationList = z.array(relationEntry).optional();

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    created: z.coerce.date(),
    modified: z.coerce.date().optional(),
    // Relations
    up: relationList,
    is: relationList,
    next: z.string().optional(),
    prev: z.string().optional(),
    ref: z.array(z.string()).optional(),
    refi: z.array(z.string()).optional(),
    // External links (type → url)
    links: z.record(z.string(), z.string()).optional(),
  }).passthrough(),
});

export const collections = { pages };
