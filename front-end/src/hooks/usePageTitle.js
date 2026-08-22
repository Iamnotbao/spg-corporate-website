import { useEffect } from 'react';

const DEFAULT_DESCRIPTION =
  'Mandora là nền tảng học tiếng Trung dành cho người Việt với khóa học, HSK, từ vựng, Hán tự và luyện tập theo lộ trình rõ ràng.';

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    document.head.appendChild(element);
  }
  return element;
}

function siteOrigin() {
  const configured = String(import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
  return configured || window.location.origin;
}

function isPrivatePath(pathname) {
  return (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/my-courses' ||
    pathname === '/progress' ||
    pathname.endsWith('/quiz')
  );
}

export function usePageTitle(title, options = {}) {
  const description = options.description || DEFAULT_DESCRIPTION;
  const noIndex = options.noIndex ?? isPrivatePath(window.location.pathname);

  useEffect(() => {
    const pageTitle = title ? `${title} | Mandora` : 'Mandora';
    const canonicalUrl = `${siteOrigin()}${window.location.pathname === '/' ? '/' : window.location.pathname}`;

    document.title = pageTitle;

    ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute(
      'content',
      description,
    );
    ensureMeta('meta[name="robots"]', { name: 'robots' }).setAttribute(
      'content',
      noIndex ? 'noindex, nofollow' : 'index, follow',
    );
    ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute(
      'content',
      pageTitle,
    );
    ensureMeta('meta[property="og:description"]', {
      property: 'og:description',
    }).setAttribute('content', description);
    ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute(
      'content',
      canonicalUrl,
    );
    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute(
      'content',
      pageTitle,
    );
    ensureMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
    }).setAttribute('content', description);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [description, noIndex, title]);
}
