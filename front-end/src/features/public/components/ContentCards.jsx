import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicCategories } from '../../../services/categoryService.js';
import '../../../styles/news-categories.css';
import { localizeContent, usePublicMessages } from '../i18n.js';
import { formatPublishedDate, getContentId, getExcerpt } from '../utils/content.js';
import { EmptyState } from './ContentState.jsx';
import Pagination from './Pagination.jsx';
import SafeImage from './SafeImage.jsx';

const PAGE_SIZE = 3;
const FALLBACK_CATEGORIES = [
  { slug: 'activity', name: 'Hoạt động' },
  { slug: 'talent', name: 'Phát triển nhân tài' },
  { slug: 'union', name: 'Công đoàn' },
  { slug: 'company', name: 'Tin doanh nghiệp' },
  { slug: 'achievement', name: 'Thành tựu' },
];

const CATEGORY_KEYS = {
  activity: 'activities', talent: 'talent', union: 'union', company: 'companyNews', achievement: 'achievements',
};

function NewsCard({ categoryLabels, item, language, t }) {
  const localized = localizeContent(item, language);
  const id = getContentId(item);
  const dateValue = item.publishedAt || item.createdAt || item.updatedAt;
  const date = formatPublishedDate(dateValue);
  const category = item.category || 'activity';

  return (
    <article className="public-content-card public-content-card--news">
      <Link className="public-content-card__media-link" to={id ? `/news/${id}` : '/#news'}>
        <SafeImage src={item.imageUrl} alt={localized.title} />
      </Link>
      <div className="public-content-card__body">
        <div className="public-content-card__meta">
          <span>{CATEGORY_KEYS[category] ? t(CATEGORY_KEYS[category]) : categoryLabels[category] || 'SPG News'}</span>
          {date && <time dateTime={dateValue}>{date}</time>}
        </div>
        <h3><Link to={id ? `/news/${id}` : '/#news'}>{localized.title || t('newsFallback')}</Link></h3>
        <p>{getExcerpt(localized, language === 'vi' ? 'Cập nhật mới nhất từ SPG Logistics.' : '')}</p>
        <Link className="public-text-link" to={id ? `/news/${id}` : '/#news'}>
          {t('readArticle')} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

function JobCard({ item, language, t }) {
  const localized = localizeContent(item, language);
  const id = getContentId(item);
  return (
    <article className="public-content-card public-content-card--job">
      <div className="public-content-card__media-link">
        <SafeImage src={item.imageUrl} alt={localized.title} />
        <span className="public-content-card__opening">{t('hiring')}</span>
      </div>
      <div className="public-content-card__body">
        <div className="public-content-card__tags">
          <span>{localized.location || (language === 'vi' ? 'Việt Nam' : 'Vietnam')}</span>
          <span>{localized.type || 'Full-time'}</span>
        </div>
        <h3>{localized.title || t('jobFallback')}</h3>
        <p>{getExcerpt(localized, '')}</p>
        <Link className="public-button public-button--compact" to={id ? `/careers/${id}` : '/#careers'}>
          {t('viewPosition')} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

export default function ContentCards({ emptyMessage, items, label, type }) {
  const isNews = type === 'news';
  const { language, t } = usePublicMessages();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  useEffect(() => {
    if (!isNews) return undefined;
    const controller = new AbortController();
    getPublicCategories({ type: 'posts', signal: controller.signal })
      .then((data) => { if (data.length) setCategories(data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isNews]);

  const categoryLabels = useMemo(() => Object.fromEntries(categories.map((item) => [item.slug, item.name])), [categories]);
  const tabs = useMemo(() => [{ slug: 'all', name: t('all') }, ...categories.filter((item) => item.active !== false)], [categories, t]);
  const filteredItems = useMemo(() => {
    if (!isNews || category === 'all') return items;
    return items.filter((item) => (item.category || 'activity') === category);
  }, [category, isNews, items]);

  const categoryCounts = useMemo(() => {
    if (!isNews) return {};
    return items.reduce((counts, item) => {
      const key = item.category || 'activity'; counts.all += 1; counts[key] = (counts[key] || 0) + 1; return counts;
    }, { all: 0 });
  }, [isNews, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [category, items.length]);
  useEffect(() => { if (category !== 'all' && !tabs.some((item) => item.slug === category)) setCategory('all'); }, [category, tabs]);

  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  if (!items.length) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <div>
      {isNews && (
        <div className="public-news-tabs" aria-label={t('news')} role="tablist">
          {tabs.map((tab) => (
            <button aria-selected={category === tab.slug} className={category === tab.slug ? 'is-active' : ''} key={tab.slug} onClick={() => setCategory(tab.slug)} role="tab" type="button">
              <span>{tab.slug === 'all' ? t('all') : CATEGORY_KEYS[tab.slug] ? t(CATEGORY_KEYS[tab.slug]) : tab.name}</span>
              <small>{categoryCounts[tab.slug] || 0}</small>
            </button>
          ))}
        </div>
      )}

      {filteredItems.length ? (
        <>
          <div className="public-card-grid">
            {visibleItems.map((item) => isNews
              ? <NewsCard categoryLabels={categoryLabels} key={getContentId(item) || item.title} item={item} language={language} t={t} />
              : <JobCard key={getContentId(item) || item.title} item={item} language={language} t={t} />)}
          </div>
          <Pagination label={label} page={page} totalPages={totalPages} onChange={setPage} />
        </>
      ) : <EmptyState>{t('emptyCategory')}</EmptyState>}
    </div>
  );
}
