import { useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import '../../../styles/content-attachment.css';
import ContentAttachment from '../../public/components/ContentAttachment.jsx';
import SafeImage from '../../public/components/SafeImage.jsx';
import StructuredContent from '../../public/components/StructuredContent.jsx';
import { usePublicDetail } from '../../public/hooks/usePublicContent.js';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import { formatPublishedDate } from '../../public/utils/content.js';
import { getBlogCategoryLabel } from '../constants.js';
import { getPublishedBlogPost } from '../services/blogService.js';
import '../styles/blog.css';

export default function BlogDetailPage() {
  const { id } = useParams();
  const post = usePublicDetail(getPublishedBlogPost, id);
  usePageTitle(post.data?.title || 'Bài viết');

  if (post.status === 'loading') {
    return (
      <section className="blog-detail-state">
        <LoadingState count={1} label="Đang tải bài viết" />
      </section>
    );
  }

  if (post.status === 'error') {
    return (
      <section className="blog-detail-state">
        <ErrorState message={post.error} onRetry={post.retry} />
      </section>
    );
  }

  if (!post.data) return <NotFoundPage />;

  const publishedDate = formatPublishedDate(post.data.publishedAt || post.data.createdAt);

  return (
    <article className="blog-detail">
      <header className="blog-detail__header">
        <div className="public-container blog-detail__header-inner">
          <div className="blog-detail__meta">
            <span>{getBlogCategoryLabel(post.data)}</span>
            {publishedDate && (
              <time dateTime={post.data.publishedAt || post.data.createdAt}>
                {publishedDate}
              </time>
            )}
          </div>
          <h1>{post.data.title}</h1>
          {post.data.summary && <p>{post.data.summary}</p>}
        </div>
      </header>
      <div className="public-container blog-detail__content">
        {post.data.imageUrl && (
          <SafeImage
            alt={post.data.title}
            className="blog-detail__cover"
            eager
            src={post.data.imageUrl}
          />
        )}
        <div className="blog-detail__body">
          <StructuredContent
            blocks={post.data.contentBlocks}
            fallbackText={post.data.content}
          />
          <ContentAttachment item={post.data} />
        </div>
      </div>
    </article>
  );
}
