import { useCallback, useState } from 'react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { usePublicCollection } from '../../public/hooks/usePublicContent.js';
import BlogCard from '../components/BlogCard.jsx';
import { BLOG_CATEGORIES } from '../constants.js';
import { listPublishedBlogPosts } from '../services/blogService.js';
import '../styles/blog.css';

export default function BlogPage() {
  usePageTitle('Blog');
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const loadPosts = useCallback(
    () => listPublishedBlogPosts({ category, search }),
    [category, search],
  );
  const posts = usePublicCollection(loadPosts);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(draftSearch.trim());
  }

  return (
    <>
      <PageHeader
        description="Kiến thức ngôn ngữ, phương pháp học và những góc nhìn giúp bạn duy trì hành trình tiếng Trung."
        eyebrow="Góc học tiếng Trung"
        title="Blog"
      />
      <section className="blog-index-section">
        <div className="public-container">
          <div className="blog-toolbar">
            <form className="catalog-search" onSubmit={submitSearch} role="search">
              <span aria-hidden="true">⌕</span>
              <label className="visually-hidden" htmlFor="blog-search">
                Tìm bài viết
              </label>
              <input
                id="blog-search"
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Tìm bài viết…"
                type="search"
                value={draftSearch}
              />
              <button className="visually-hidden" type="submit">
                Tìm
              </button>
            </form>
            <div aria-label="Lọc chuyên mục Blog" className="filter-chips" role="group">
              <button
                aria-pressed={!category}
                className={!category ? 'is-active' : undefined}
                onClick={() => setCategory('')}
                type="button"
              >
                Tất cả
              </button>
              {BLOG_CATEGORIES.map((item) => (
                <button
                  aria-pressed={category === item.slug}
                  className={category === item.slug ? 'is-active' : undefined}
                  key={item.slug}
                  onClick={() => setCategory(item.slug)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {posts.status === 'loading' && <LoadingState label="Đang tải Blog" />}
          {posts.status === 'error' && (
            <ErrorState message={posts.error} onRetry={posts.retry} />
          )}
          {posts.status === 'ready' && posts.data.length === 0 && (
            <EmptyState
              description="Chưa có bài viết đã xuất bản trong chuyên mục hoặc từ khóa này."
              icon="阅"
              title="Chưa có bài viết phù hợp"
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
    </>
  );
}
