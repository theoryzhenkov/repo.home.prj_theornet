import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const relationMap = z.record(z.string(), z.string().nullable()).optional();

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    created: z.coerce.date(),
    modified: z.coerce.date().optional(),
    // Relations (slug → label, label can be null)
    up: relationMap,
    is: relationMap,
    next: z.string().optional(),
    prev: z.string().optional(),
    ref: z.array(z.string()).optional(),
    refi: z.array(z.string()).optional(),
    // External links (type → url)
    links: z.record(z.string(), z.string()).optional(),
  }).passthrough(),
});

export const collections = { pages };
