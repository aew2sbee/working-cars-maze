// @ts-check
import { defineConfig } from 'astro/config';

// BASE_PATH is set by the PR preview workflow (e.g. /working-cars-maze/pr-preview/pr-1/).
const base = process.env.BASE_PATH ?? '/working-cars-maze/';

// https://astro.build/config
export default defineConfig({
  site: 'https://aew2sbee.github.io',
  base,
  trailingSlash: 'always',
  build: {
    // GitHub Pages (branch source) runs Jekyll, which drops folders starting with "_".
    assets: 'assets',
  },
});
