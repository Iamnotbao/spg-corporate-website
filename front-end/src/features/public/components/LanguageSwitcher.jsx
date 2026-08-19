import { useEffect, useMemo, useRef, useState } from 'react';
import { listPublicLanguages } from '../../../services/languageService.js';
import '../../../styles/language-menu.css';

export const PUBLIC_LANGUAGE_STORAGE_KEY = 'spg-language';
const FALLBACK_LANGUAGES = [
  { code: 'vi', titleNameL: 'Việt Nam', isDefault: true },
  { code: 'en', titleNameL: 'English' },
  { code: 'zh-tw', titleNameL: '繁體中文' },
];

function getLabel(item) {
  return item?.titleNameL || item?.titleNameE || item?.titleNameT || item?.code || 'Ngôn ngữ';
}

export default function LanguageSwitcher() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(FALLBACK_LANGUAGES);
  const [value, setValue] = useState(() => window.localStorage.getItem(PUBLIC_LANGUAGE_STORAGE_KEY) || 'vi');

  useEffect(() => {
    const controller = new AbortController();
    listPublicLanguages({ signal: controller.signal })
      .then((payload) => {
        const languages = Array.isArray(payload?.data) && payload.data.length ? payload.data : FALLBACK_LANGUAGES;
        setItems(languages);
        const selected = languages.some((item) => item.code === value)
          ? value
          : languages.find((item) => item.isDefault)?.code || languages[0]?.code || 'vi';
        applyLanguage(selected);
      })
      .catch(() => setItems(FALLBACK_LANGUAGES));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function onPointerDown(event) { if (!rootRef.current?.contains(event.target)) setOpen(false); }
    function onKeyDown(event) { if (event.key === 'Escape') setOpen(false); }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const current = useMemo(() => items.find((item) => item.code === value) || items[0] || FALLBACK_LANGUAGES[0], [items, value]);

  function applyLanguage(next) {
    setValue(next);
    document.documentElement.lang = next;
    window.localStorage.setItem(PUBLIC_LANGUAGE_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent('spg-language-change', { detail: { code: next } }));
  }

  function choose(next) { applyLanguage(next); setOpen(false); }

  return (
    <div className={`public-language-control${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        className="public-language-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Ngôn ngữ: ${getLabel(current)}`}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span className="public-language-control__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.5 3.7 5.5 3.7 9S14.4 18.5 12 21M12 3C9.6 5.5 8.3 8.5 8.3 12s1.3 6.5 3.7 9" /></svg>
        </span>
        <strong>{String(current?.code || 'vi').toUpperCase()}</strong>
        <span className="public-language-control__chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="public-language-menu" role="listbox" aria-label="Chọn ngôn ngữ">
          {items.map((item) => {
            const active = item.code === value;
            return (
              <button
                className={active ? 'is-active' : ''}
                key={item.code}
                role="option"
                aria-selected={active}
                type="button"
                onClick={() => choose(item.code)}
              >
                <span>{getLabel(item)}</span>
                <small>{String(item.code || '').toUpperCase()}</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
