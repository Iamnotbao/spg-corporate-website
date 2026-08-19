import { Link, useParams } from 'react-router-dom';
import ContentAttachment from '../components/ContentAttachment.jsx';
import { ContentError, DetailLoading } from '../components/ContentState.jsx';
import DetailCarousel from '../components/DetailCarousel.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import TextContent from '../components/TextContent.jsx';
import {
  useDocumentTitle,
  usePageTop,
  usePublicDetail,
} from '../hooks/usePublicContent.js';
import { formatPublishedDate, getContentImages } from '../utils/content.js';

export default function NewsDetailPage({ loadPost }) {
  const { id } = useParams();
  const { data: post, status, retry } = usePublicDetail(loadPost, id);
  const publishedDate = formatPublishedDate(
    post?.publishedAt || post?.createdAt || post?.updatedAt,
  );

  usePageTop();
  useDocumentTitle(
    post?.title ? `${post.title} | SPG Logistics` : 'Tin tức | SPG Logistics',
  );

  return (
    <PublicLayout>
      <article className="public-detail public-detail--article">
        {status === 'loading' && <DetailLoading label="Đang tải bài viết…" />}

        {status === 'error' && (
          <div className="public-container public-detail__state-wrap">
            <ContentError
              message="Không tìm thấy hoặc chưa thể tải bài viết này."
              onRetry={retry}
            />
            <Link className="public-link-arrow" to="/#news">
              <span aria-hidden="true">←</span>
              Quay lại tin tức
            </Link>
          </div>
        )}

        {status === 'ready' && post && (
          <>
            <header className="public-detail__hero">
              <div className="public-container public-detail__hero-inner">
                <nav className="public-breadcrumb" aria-label="Đường dẫn">
                  <Link to="/">Trang chủ</Link>
                  <span aria-hidden="true">/</span>
                  <Link to="/#news">Tin tức</Link>
                </nav>
                <p className="public-eyebrow">SPG News</p>
                <h1>{post.title || 'Tin tức SPG'}</h1>
                <div className="public-detail__byline">
                  <span>SPG Logistics</span>
                  {publishedDate && (
                    <time dateTime={post.publishedAt || post.createdAt}>
                      {publishedDate}
                    </time>
                  )}
                </div>
              </div>
            </header>

            <div className="public-container public-article-layout">
              <DetailCarousel alt={post.title} images={getContentImages(post)} />

              <div className="public-article-layout__body">
                {post.excerpt && <p className="public-article-lead">{post.excerpt}</p>}
                <TextContent text={post.content || post.description} />
                <ContentAttachment item={post} label="Tài liệu bài viết" />

                <div className="public-detail__back">
                  <Link className="public-link-arrow" to="/#news">
                    <span aria-hidden="true">←</span>
                    Quay lại tin tức
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </article>
    </PublicLayout>
  );
}
