import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import remarkCallout from '@r4ai/remark-callout';
import remarkTodo from './src/lib/remark-todo';
import remarkWikilink from './src/lib/remark-wikilink';

export default defineConfig({
  site: 'https://home.theor.net',
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: [/^\/pagefind\//],
      },
    },
  },

  integrations: [
    mdx({
      remarkPlugins: [remarkCallout, remarkTodo, remarkWikilink],
    }),
  ],

  markdown: {
    remarkPlugins: [remarkCallout, remarkTodo, remarkWikilink],
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
