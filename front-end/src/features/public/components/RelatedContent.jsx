import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContentId, getExcerpt } from '../utils/content.js';

function rankRelated(items, current) {
  const currentCategory = String(current?.category || '').trim().toLowerCase();
  const currentId = getContentId(current);

  return [...items]
    .filter((item) => getContentId(item) !== currentId)
    .sort((a, b) => {
      const aCategory = String(a?.category || '').trim().toLowerCase();
      const bCategory = String(b?.category || '').trim().toLowerCase();
      const aScore = currentCategory && aCategory === currentCategory ? 1 : 0;
      const bScore = currentCategory && bCategory === currentCategory ? 1 : 0;
      return bScore - aScore;
    })
    .slice(0, 4);
}

export default function RelatedContent({ current, loadItems, type }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    loadItems({ signal: controller.signal })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (error?.name !== 'AbortError') setItems([]);
      });
    return () => controller.abort();
  }, [loadItems]);

  const related = useMemo(() => rankRelated(items, current), [items, current]);
  if (!related.length) return null;

  const isPost = type === 'posts';
  const basePath = isPost ? '/news' : '/careers';

  return (
    <aside className="public-related" aria-labelledby="public-related-title">
      <div className="public-related__heading">
        <p className="public-eyebrow">Khám phá thêm</p>
        <h2 id="public-related-title">{isPost ? 'Bài viết liên quan' : 'Vị trí liên quan'}</h2>
      </div>
      <div className="public-related__list">
        {related.map((item, index) => {
          const id = getContentId(item);
          return (
            <Link className="public-related__item" key={id} to={`${basePath}/${id}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                {item.category && <small>{item.category}</small>}
                <strong>{item.title || (isPost ? 'Bài viết SPG' : 'Cơ hội nghề nghiệp')}</strong>
                <p>{getExcerpt(item, isPost ? 'Tin tức từ SPG.' : 'Cơ hội nghề nghiệp tại SPG.')}</p>
              </div>
              <i aria-hidden="true">↗</i>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
