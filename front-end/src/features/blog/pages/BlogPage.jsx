import { useCallback, useMemo, useState } from 'react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import PublicPagination from '../../../components/ui/PublicPagination.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { usePublicCollection } from '../../public/hooks/usePublicContent.js';
import BlogCard from '../components/BlogCard.jsx';
import { BLOG_CATEGORIES } from '../constants.js';
import { listPublishedBlogPosts } from '../services/blogService.js';
import '../styles/blog.css';

const PAGE_SIZE = 9;

export default function BlogPage() {
  usePageTitle('Blog');
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const loadPosts = useCallback(
    () => listPublishedBlogPosts({ category, search }),
    [category, search],
  );
  const posts = usePublicCollection(loadPosts);
  const pagedPosts = useMemo(
    () => posts.data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, posts.data],
  );

  function submitSearch(event) {
    event.preventDefault();
    setSearch(draftSearch.trim());
    setPage(1);
  }

  function selectCategory(nextCategory) {
    setCategory(nextCategory);
    setPage(1);
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
                onClick={() => selectCategory('')}
                type="button"
              >
                Tất cả
              </button>
              {BLOG_CATEGORIES.map((item) => (
                <button
                  aria-pressed={category === item.slug}
                  className={category === item.slug ? 'is-active' : undefined}
                  key={item.slug}
                  onClick={() => selectCategory(item.slug)}
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
            <>
              <div className="blog-grid">
                {pagedPosts.map((post) => (
                  <BlogCard key={post._id?.$oid || post._id || post.id} post={post} />
                ))}
              </div>
              <PublicPagination
                onPageChange={setPage}
                page={page}
                pageSize={PAGE_SIZE}
                total={posts.data.length}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
