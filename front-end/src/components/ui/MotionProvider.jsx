import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TARGETS = [
  'main > section',
  '.page-header',
  '.course-card',
  '.vocabulary-card',
  '.blog-card',
  '.content-state',
  '.student-access-card',
  '.student-panel',
  '.admin-page-header',
  '.admin-panel',
  '.admin-stat-card',
  '.admin-learning-form',
].join(',');

export default function MotionProvider() {
  const location = useLocation();

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observed = new WeakSet();
    let observer;

    const reveal = (element) => {
      element.classList.add('motion-reveal');
      if (reducedMotion || !observer) {
        element.classList.add('is-revealed');
        return;
      }
      if (!observed.has(element)) {
        observed.add(element);
        observer.observe(element);
      }
    };

    if (!reducedMotion && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
    }

    const scan = (root = document) => {
      if (root instanceof Element && root.matches(TARGETS)) reveal(root);
      root.querySelectorAll?.(TARGETS).forEach(reveal);
    };

    const frame = window.requestAnimationFrame(() => scan());
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
      });
    });
    mutationObserver.observe(document.getElementById('root'), { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, [location.pathname]);

  return null;
}
