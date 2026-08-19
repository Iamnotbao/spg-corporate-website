import { useEffect, useMemo, useState } from 'react';
import { listPublicLanguages } from '../../../services/languageService.js';

export const PUBLIC_LANGUAGE_STORAGE_KEY = 'spg-language';
const FALLBACK_LANGUAGE = {
  code: 'vi',
  titleNameE: 'Vietnamese',
  titleNameL: 'Tiếng Việt',
  titleNameT: 'Tiếng Việt',
  enabled: true,
  isDefault: true,
};

function getLabel(item) {
  return item?.titleNameL || item?.titleNameE || item?.titleNameT || item?.code || 'Ngôn ngữ';
}

export default function LanguageSwitcher() {
  const [items, setItems] = useState([FALLBACK_LANGUAGE]);
  const [value, setValue] = useState(() => window.localStorage.getItem(PUBLIC_LANGUAGE_STORAGE_KEY) || 'vi');

  useEffect(() => {
    const controller = new AbortController();
    listPublicLanguages({ signal: controller.signal })
      .then((payload) => {
        const languages = Array.isArray(payload?.data) && payload.data.length
          ? payload.data
          : [FALLBACK_LANGUAGE];
        setItems(languages);
        const selected = value && languages.some((item) => item.code === value)
          ? value
          : languages.find((item) => item.isDefault)?.code || languages[0]?.code || 'vi';
        setValue(selected);
        document.documentElement.lang = selected;
        window.localStorage.setItem(PUBLIC_LANGUAGE_STORAGE_KEY, selected);
      })
      .catch(() => {
        setItems([FALLBACK_LANGUAGE]);
        setValue('vi');
        document.documentElement.lang = 'vi';
      });
    return () => controller.abort();
  }, []);

  const current = useMemo(
    () => items.find((item) => item.code === value) || items[0] || FALLBACK_LANGUAGE,
    [items, value],
  );

  function changeLanguage(event) {
    const next = event.target.value;
    setValue(next);
    document.documentElement.lang = next;
    window.localStorage.setItem(PUBLIC_LANGUAGE_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent('spg-language-change', { detail: { code: next } }));
  }

  return (
    <label className="public-language-control" title={getLabel(current)}>
      <span className="public-language-control__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.4 2.5 3.7 5.5 3.7 9S14.4 18.5 12 21M12 3C9.6 5.5 8.3 8.5 8.3 12s1.3 6.5 3.7 9" />
        </svg>
      </span>
      <span className="public-language-control__value" aria-hidden="true">
        {String(current?.code || 'vi').toUpperCase()}
      </span>
      <span className="public-visually-hidden">Ngôn ngữ</span>
      <select
        className="public-language-switcher"
        aria-label="Ngôn ngữ"
        value={value}
        onChange={changeLanguage}
      >
        {items.map((item) => (
          <option value={item.code} key={item.code}>
            {getLabel(item)} ({String(item.code || '').toUpperCase()})
          </option>
        ))}
      </select>
      <span className="public-language-control__chevron" aria-hidden="true">⌄</span>
    </label>
  );
}
