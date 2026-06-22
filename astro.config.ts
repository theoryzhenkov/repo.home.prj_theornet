import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkCallout from '@r4ai/remark-callout';
import remarkTodo from './src/lib/remark-todo';
import rehypeCalloutIcons from './src/lib/rehype-callout-icons';


export default defineConfig({
  site: 'https://theor.net',
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
      remarkPlugins: [remarkCallout, remarkTodo],
      rehypePlugins: [rehypeCalloutIcons],
    }),
    sitemap(),
  ],

  markdown: {
    remarkPlugins: [remarkCallout, remarkTodo],
    rehypePlugins: [rehypeCalloutIcons],
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
