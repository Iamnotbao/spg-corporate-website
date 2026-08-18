import { useEffect } from 'react';

const SELECTOR = '.public-shell [data-reveal]';

export default function useScrollReveal(dependencies = []) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(SELECTOR));

    if (!elements.length) return undefined;

    elements.forEach((element) => element.classList.add('public-reveal'));

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -9% 0px',
        threshold: 0.12,
      },
    );

    elements
      .filter((element) => !element.classList.contains('is-visible'))
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // The caller controls when newly rendered API content should be observed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
