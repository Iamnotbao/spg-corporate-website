import { useEffect, useState } from 'react';
import { listPublicLanguages } from '../../../services/languageService.js';

const STORAGE_KEY = 'spg-language';

function getLabel(item) {
  return item.titleNameL || item.titleNameE || item.titleNameT || item.code;
}

export default function LanguageSwitcher() {
  const [items, setItems] = useState([]);
  const [value, setValue] = useState(() => window.localStorage.getItem(STORAGE_KEY) || '');

  useEffect(() => {
    const controller = new AbortController();
    listPublicLanguages({ signal: controller.signal })
      .then((payload) => {
        const languages = payload?.data || [];
        setItems(languages);
        const selected = value && languages.some((item) => item.code === value)
          ? value
          : languages.find((item) => item.isDefault)?.code || languages[0]?.code || '';
        if (selected) {
          setValue(selected);
          document.documentElement.lang = selected;
          window.localStorage.setItem(STORAGE_KEY, selected);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function changeLanguage(event) {
    const next = event.target.value;
    setValue(next);
    document.documentElement.lang = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent('spg-language-change', { detail: { code: next } }));
  }

  return (
    <select
      className="public-language-switcher"
      aria-label="Ngôn ngữ"
      disabled={!items.length}
      value={value}
      onChange={changeLanguage}
      title={items.find((item) => item.code === value) ? getLabel(items.find((item) => item.code === value)) : 'Ngôn ngữ'}
    >
      {items.map((item) => (
        <option value={item.code} key={item.code}>{item.code.toUpperCase()}</option>
      ))}
    </select>
  );
}
