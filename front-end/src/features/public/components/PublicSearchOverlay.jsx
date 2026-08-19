import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs, getPosts } from '../../../services/publicService.js';
import { localizeContent, usePublicLanguage } from '../i18n.js';
import { getContentId } from '../utils/content.js';
import '../../../styles/advanced-search.css';

const COPY = {
  vi: ['Tìm kiếm trên SPG','Tìm bài viết, tuyển dụng, hoạt động hoặc nội dung về nhà máy…','Tất cả','Bài viết','Tuyển dụng','Chưa có kết quả phù hợp.','Đang tìm…'],
  en: ['Search SPG','Search articles, careers, factory activities and more…','All','Posts','Careers','No matching results.','Searching…'],
  'zh-tw': ['搜尋 SPG','搜尋文章、職缺、工廠活動等內容…','全部','文章','人才招募','沒有符合的結果。','搜尋中…'],
};

export default function PublicSearchOverlay({ open, onClose }) {
  const language = usePublicLanguage();
  const c = COPY[language] || COPY.vi;
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); setStatus('idle'); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const tasks = [];
        if (scope !== 'jobs') tasks.push(getPosts({ search: query.trim(), pageSize: 12, signal: controller.signal }).then((items) => items.map((item) => ({ ...item, _kind: 'post' }))));
        if (scope !== 'posts') tasks.push(getJobs({ search: query.trim(), pageSize: 12, signal: controller.signal }).then((items) => items.map((item) => ({ ...item, _kind: 'job' }))));
        const groups = await Promise.all(tasks);
        setResults(groups.flat().map((item) => localizeContent(item, language)).slice(0, 18));
        setStatus('ready');
      } catch (error) {
        if (error?.name !== 'AbortError') setStatus('ready');
      }
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [language, open, query, scope]);

  const grouped = useMemo(() => ({ posts: results.filter((item) => item._kind === 'post'), jobs: results.filter((item) => item._kind === 'job') }), [results]);
  if (!open) return null;

  return (
    <div className="advanced-search" role="dialog" aria-modal="true" aria-label={c[0]}>
      <button className="advanced-search__scrim" type="button" onClick={onClose} aria-label="Close" />
      <section className="advanced-search__panel">
        <div className="advanced-search__top"><span>SPG SEARCH</span><button type="button" onClick={onClose}>×</button></div>
        <h2>{c[0]}</h2>
        <label className="advanced-search__input"><span aria-hidden="true">⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c[1]} /></label>
        <div className="advanced-search__scopes">{[['all',c[2]],['posts',c[3]],['jobs',c[4]]].map(([value,label]) => <button className={scope === value ? 'is-active' : ''} key={value} onClick={() => setScope(value)} type="button">{label}</button>)}</div>
        <div className="advanced-search__results">
          {status === 'loading' && <p>{c[6]}</p>}
          {status === 'ready' && !results.length && <p>{c[5]}</p>}
          {!!grouped.posts.length && <div><small>{c[3]}</small>{grouped.posts.map((item) => <Link key={getContentId(item)} to={`/news/${getContentId(item)}`} onClick={onClose}><strong>{item.title}</strong><span>{item.summary || item.excerpt || 'SPG'}</span><i>→</i></Link>)}</div>}
          {!!grouped.jobs.length && <div><small>{c[4]}</small>{grouped.jobs.map((item) => <Link key={getContentId(item)} to={`/careers/${getContentId(item)}`} onClick={onClose}><strong>{item.title}</strong><span>{item.location || item.summary || 'SPG'}</span><i>→</i></Link>)}</div>}
        </div>
      </section>
    </div>
  );
}
