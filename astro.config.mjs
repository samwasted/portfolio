// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

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

  adapter: cloudflare(),
});