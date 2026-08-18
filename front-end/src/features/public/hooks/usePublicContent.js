import { useCallback, useEffect, useState } from 'react';
import { normalizeCollection, normalizeDetail } from '../utils/content.js';

export function usePublicCollection(loader) {
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState({
    data: [],
    error: '',
    status: 'loading',
  });

  useEffect(() => {
    let isActive = true;

    setState((current) => ({ ...current, error: '', status: 'loading' }));
    Promise.resolve()
      .then(() => loader())
      .then((payload) => {
        if (!isActive) return;
        setState({ data: normalizeCollection(payload), error: '', status: 'ready' });
      })
      .catch((error) => {
        if (!isActive) return;
        setState({
          data: [],
          error: error?.message || 'Không thể tải nội dung.',
          status: 'error',
        });
      });

    return () => {
      isActive = false;
    };
  }, [loader, requestKey]);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);
  return { ...state, retry };
}

export function usePublicDetail(loader, id) {
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState({
    data: null,
    error: '',
    status: 'loading',
  });

  useEffect(() => {
    let isActive = true;

    setState({ data: null, error: '', status: 'loading' });
    Promise.resolve()
      .then(() => loader(id))
      .then((payload) => {
        if (!isActive) return;
        setState({ data: normalizeDetail(payload), error: '', status: 'ready' });
      })
      .catch((error) => {
        if (!isActive) return;
        setState({
          data: null,
          error: error?.message || 'Không thể tải nội dung.',
          status: 'error',
        });
      });

    return () => {
      isActive = false;
    };
  }, [id, loader, requestKey]);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);
  return { ...state, retry };
}

export function useDocumentTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export function usePageTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
}

export function useHashScroll() {
  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);
}
