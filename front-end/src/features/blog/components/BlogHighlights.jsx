import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import { usePublicCollection } from '../../public/hooks/usePublicContent.js';
import BlogCard from './BlogCard.jsx';
import { listPublishedBlogPosts } from '../services/blogService.js';
import '../styles/blog.css';

export default function BlogHighlights() {
  const loadPosts = useCallback(
    () => listPublishedBlogPosts({ limit: 3, pageSize: 20 }),
    [],
  );
  const posts = usePublicCollection(loadPosts);

  return (
    <section
      className="home-section home-section--blog"
      aria-labelledby="latest-blog-title"
    >
      <div className="public-container">
        <div className="home-section-heading">
          <div>
            <p className="public-eyebrow">Đọc và học thêm</p>
            <h2 id="latest-blog-title">Bài viết mới từ Mandora</h2>
          </div>
          <Link className="text-link" to="/blog">
            Xem tất cả <span aria-hidden="true">→</span>
          </Link>
        </div>
        {posts.status === 'loading' && <LoadingState label="Đang tải bài viết mới" />}
        {posts.status === 'error' && (
          <ErrorState message={posts.error} onRetry={posts.retry} />
        )}
        {posts.status === 'ready' && posts.data.length === 0 && (
          <EmptyState
            description="Các bài viết cũ không được hiển thị nếu chưa được phân loại lại cho Mandora."
            icon="阅"
            title="Chưa có bài viết Mandora"
          />
        )}
        {posts.status === 'ready' && posts.data.length > 0 && (
          <div className="blog-grid">
            {posts.data.map((post) => (
              <BlogCard key={post._id?.$oid || post._id || post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
