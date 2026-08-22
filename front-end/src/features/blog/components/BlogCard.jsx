import { Link } from 'react-router-dom';
import SafeImage from '../../public/components/SafeImage.jsx';
import {
  formatPublishedDate,
  getContentId,
  getExcerpt,
} from '../../public/utils/content.js';
import { getBlogCategoryLabel } from '../constants.js';

export default function BlogCard({ post }) {
  const id = getContentId(post);

  return (
    <article className="blog-card">
      <Link className="blog-card__image" to={`/blog/${id}`}>
        <SafeImage alt={post.title} src={post.imageUrl} />
      </Link>
      <div className="blog-card__body">
        <div className="blog-card__meta">
          <span>{getBlogCategoryLabel(post)}</span>
          {formatPublishedDate(post.publishedAt || post.createdAt) && (
            <time dateTime={post.publishedAt || post.createdAt}>
              {formatPublishedDate(post.publishedAt || post.createdAt)}
            </time>
          )}
        </div>
        <h3>
          <Link to={`/blog/${id}`}>{post.title}</Link>
        </h3>
        <p>{getExcerpt(post, 'Bài viết từ Mandora.')}</p>
        <Link className="blog-card__link" to={`/blog/${id}`}>
          Đọc bài viết <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
