import { mkdir, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const PUBLIC_ROUTES = [
  '/',
  '/courses',
  '/hsk',
  '/vocabulary',
  '/characters',
  '/practice',
  '/blog',
];
const SITE_TOKEN = '__MANDORA_SITE_URL__';
const CACHE_OWNER = userInfo().username.replace(/[^a-zA-Z0-9._-]/g, '-');

function normalizeOrigin(value) {
  return String(value || '')
    .trim()
    .replace(/\/$/, '');
}

function seoPlugin(siteOrigin) {
  const origin = siteOrigin || 'http://localhost:5173';
  return {
    name: 'mandora-seo',
    transformIndexHtml(html) {
      return html.replaceAll(SITE_TOKEN, origin);
    },
    async closeBundle() {
      if (!siteOrigin) {
        console.warn(
          '[seo] VITE_SITE_URL is not configured; build SEO files use localhost.',
        );
      }
      const absolute = (route) => `${origin}${route === '/' ? '/' : route}`;
      const robots = `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`;
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_ROUTES.map(
        (route) => `  <url><loc>${absolute(route)}</loc></url>`,
      ).join('\n')}\n</urlset>\n`;
      const dist = path.resolve(process.cwd(), 'dist');
      await mkdir(dist, { recursive: true });
      await Promise.all([
        writeFile(path.join(dist, 'robots.txt'), robots, 'utf8'),
        writeFile(path.join(dist, 'sitemap.xml'), sitemap, 'utf8'),
      ]);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteOrigin = normalizeOrigin(
    env.VITE_SITE_URL || process.env.VITE_SITE_URL || process.env.CF_PAGES_URL,
  );

  if (process.env.CF_PAGES && !env.VITE_SITE_URL && process.env.CF_PAGES_URL) {
    console.warn(
      '[seo] VITE_SITE_URL is not configured; using CF_PAGES_URL for this Cloudflare Pages build.',
    );
  }

  return {
    cacheDir: path.resolve(process.cwd(), 'node_modules', `.vite-${CACHE_OWNER}`),
    plugins: [react(), seoPlugin(siteOrigin)],
  };
});
