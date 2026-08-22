import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const PUBLIC_ROUTES = ['/', '/courses', '/hsk', '/vocabulary', '/characters', '/practice', '/blog'];

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function seoFilesPlugin(siteOrigin) {
  return {
    name: 'mandora-seo-files',
    async closeBundle() {
      const origin = siteOrigin || 'http://localhost:5173';
      if (!siteOrigin) {
        console.warn('[seo] VITE_SITE_URL is not configured; build SEO files use localhost.');
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
  const siteOrigin = normalizeOrigin(env.VITE_SITE_URL);

  return {
    plugins: [react(), seoFilesPlugin(siteOrigin)],
  };
});
