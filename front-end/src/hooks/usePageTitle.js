import { useEffect } from 'react';

const DEFAULT_DESCRIPTION =
  'Hanyora là nền tảng học tiếng Trung online dành cho người Việt với khóa học, HSK, từ vựng, Hán tự và luyện tập theo lộ trình rõ ràng.';

const PUBLIC_SEO = {
  '/': {
    fullTitle: 'Hanyora | Học tiếng Trung Online, HSK, Từ vựng & Hán tự',
    description:
      'Học tiếng Trung online cùng Hanyora theo lộ trình dành cho người Việt: HSK, từ vựng, Pinyin, Hán tự, luyện viết và bài tập thực hành.',
  },
  '/courses': {
    title: 'Khóa học tiếng Trung Online',
    description:
      'Khám phá khóa học tiếng Trung online trên Hanyora với lộ trình rõ ràng, nội dung phù hợp cho người Việt từ cơ bản đến nâng cao.',
  },
  '/hsk': {
    title: 'Học HSK & Luyện thi HSK Online',
    description:
      'Học HSK online cùng Hanyora, khám phá nội dung theo cấp độ và xây dựng lộ trình từ vựng, Hán tự và kỹ năng tiếng Trung phù hợp.',
  },
  '/hsk-mock-tests': {
    title: 'Đề thi thử HSK Online',
    description:
      'Luyện đề thi thử HSK online trên Hanyora để làm quen dạng bài, kiểm tra kiến thức và theo dõi quá trình ôn luyện tiếng Trung.',
  },
  '/videos': {
    title: 'Video học tiếng Trung',
    description:
      'Xem video học tiếng Trung trên Hanyora để luyện nghe, củng cố từ vựng, phát âm và kiến thức tiếng Trung theo từng chủ đề.',
  },
  '/vocabulary': {
    title: 'Từ vựng tiếng Trung theo chủ đề & HSK',
    description:
      'Tra cứu và học từ vựng tiếng Trung trên Hanyora theo chủ đề và cấp độ HSK, kèm Pinyin để ghi nhớ và luyện tập dễ hơn.',
  },
  '/characters': {
    title: 'Học Hán tự & Luyện viết chữ Hán',
    description:
      'Học Hán tự và luyện viết chữ Hán trên Hanyora, giúp người Việt ghi nhớ mặt chữ, cách viết và từ vựng tiếng Trung hiệu quả hơn.',
  },
  '/practice': {
    title: 'Bài tập tiếng Trung Online',
    description:
      'Luyện tập tiếng Trung online trên Hanyora với bài tập từ vựng, Hán tự và kiến thức theo lộ trình để củng cố kỹ năng mỗi ngày.',
  },
  '/blog': {
    title: 'Blog học tiếng Trung & Kinh nghiệm học HSK',
    description:
      'Đọc bài viết học tiếng Trung trên Hanyora với kiến thức HSK, từ vựng, Hán tự, phương pháp học và kinh nghiệm dành cho người Việt.',
  },
};

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
  const pathname = window.location.pathname;
  const seoProfile = PUBLIC_SEO[pathname];
  const resolvedTitle = seoProfile?.title || title;
  const description = options.description || seoProfile?.description || DEFAULT_DESCRIPTION;
  const noIndex = options.noIndex ?? isPrivatePath(pathname);

  useEffect(() => {
    const pageTitle =
      seoProfile?.fullTitle || (resolvedTitle ? `${resolvedTitle} | Hanyora` : 'Hanyora');
    const canonicalUrl = `${siteOrigin()}${pathname === '/' ? '/' : pathname}`;

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
  }, [description, noIndex, pathname, resolvedTitle, seoProfile]);
}
