import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

export default defineConfig({
  // Static by default; individual routes opt into on-demand rendering
  // with `export const prerender = false`.
  output: 'static',
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
  },
});
