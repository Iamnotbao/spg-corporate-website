import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/news-categories.css';
import { formatPublishedDate, getContentId, getExcerpt } from '../utils/content.js';
import { EmptyState } from './ContentState.jsx';
import Pagination from './Pagination.jsx';
import SafeImage from './SafeImage.jsx';

const PAGE_SIZE = 3;
const NEWS_TABS = [
  ['all', 'Tất cả'],
  ['activity', 'Hoạt động'],
  ['talent', 'Phát triển nhân tài'],
  ['union', 'Công đoàn'],
  ['company', 'Tin doanh nghiệp'],
  ['achievement', 'Thành tựu'],
];

const CATEGORY_LABELS = Object.fromEntries(NEWS_TABS);

function NewsCard({ item }) {
  const id = getContentId(item);
  const dateValue = item.publishedAt || item.createdAt || item.updatedAt;
  const date = formatPublishedDate(dateValue);
  const category = item.category || 'activity';

  return (
    <article className="public-content-card public-content-card--news">
      <Link
        className="public-content-card__media-link"
        to={id ? `/news/${id}` : '/#news'}
      >
        <SafeImage src={item.imageUrl} alt={item.title} />
      </Link>
      <div className="public-content-card__body">
        <div className="public-content-card__meta">
          <span>{CATEGORY_LABELS[category] || 'SPG News'}</span>
          {date && <time dateTime={dateValue}>{date}</time>}
        </div>
        <h3>
          <Link to={id ? `/news/${id}` : '/#news'}>{item.title || 'Tin tức SPG'}</Link>
        </h3>
        <p>{getExcerpt(item, 'Cập nhật mới nhất từ SPG Logistics.')}</p>
        <Link className="public-text-link" to={id ? `/news/${id}` : '/#news'}>
          Đọc bài viết
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

function JobCard({ item }) {
  const id = getContentId(item);

  return (
    <article className="public-content-card public-content-card--job">
      <div className="public-content-card__media-link">
        <SafeImage src={item.imageUrl} alt={item.title} />
        <span className="public-content-card__opening">Đang tuyển</span>
      </div>
      <div className="public-content-card__body">
        <div className="public-content-card__tags">
          <span>{item.location || 'Việt Nam'}</span>
          <span>{item.type || 'Full-time'}</span>
        </div>
        <h3>{item.title || 'Cơ hội nghề nghiệp tại SPG'}</h3>
        <p>
          {getExcerpt(item, 'Khám phá cơ hội phát triển cùng đội ngũ SPG Logistics.')}
        </p>
        <Link
          className="public-button public-button--compact"
          to={id ? `/careers/${id}` : '/#careers'}
        >
          Xem vị trí
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

export default function ContentCards({ emptyMessage, items, label, type }) {
  const isNews = type === 'news';
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('all');

  const filteredItems = useMemo(() => {
    if (!isNews || category === 'all') return items;
    return items.filter((item) => (item.category || 'activity') === category);
  }, [category, isNews, items]);

  const categoryCounts = useMemo(() => {
    if (!isNews) return {};
    return items.reduce(
      (counts, item) => {
        const key = item.category || 'activity';
        counts.all += 1;
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      },
      { all: 0 },
    );
  }, [isNews, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [category, items.length]);

  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  if (!items.length) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <div>
      {isNews && (
        <div className="public-news-tabs" aria-label="Nhóm tin tức" role="tablist">
          {NEWS_TABS.map(([value, tabLabel]) => (
            <button
              aria-selected={category === value}
              className={category === value ? 'is-active' : ''}
              key={value}
              onClick={() => setCategory(value)}
              role="tab"
              type="button"
            >
              <span>{tabLabel}</span>
              <small>{categoryCounts[value] || 0}</small>
            </button>
          ))}
        </div>
      )}

      {filteredItems.length ? (
        <>
          <div className="public-card-grid">
            {visibleItems.map((item) =>
              isNews ? (
                <NewsCard key={getContentId(item) || item.title} item={item} />
              ) : (
                <JobCard key={getContentId(item) || item.title} item={item} />
              ),
            )}
          </div>
          <Pagination label={label} page={page} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
        <EmptyState>Chưa có bài viết trong nhóm này.</EmptyState>
      )}
    </div>
  );
}
