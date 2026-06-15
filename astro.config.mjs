// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { remarkMermaid } from './src/lib/remark-mermaid.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://samarpanverma.com',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  vite: {
    assetsInclude: ['**/*.frag', '**/*.vert'],
    plugins: [tailwindcss()],
  },
  image: {
    domains: ['images.unsplash.com'],
    remotePatterns: [{ protocol: 'https' }],
  },
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
});