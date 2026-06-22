import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import remarkCallout from '@r4ai/remark-callout';
import remarkTodo from './src/lib/remark-todo';
import rehypeCalloutIcons from './src/lib/rehype-callout-icons';


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
      remarkPlugins: [remarkCallout, remarkTodo],
      rehypePlugins: [rehypeCalloutIcons],
    }),
  ],

  markdown: {
    remarkPlugins: [remarkCallout, remarkTodo],
    rehypePlugins: [rehypeCalloutIcons],
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
