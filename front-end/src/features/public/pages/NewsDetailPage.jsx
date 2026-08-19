import { Link, useParams } from 'react-router-dom';
import ContentAttachment from '../components/ContentAttachment.jsx';
import { ContentError, DetailLoading } from '../components/ContentState.jsx';
import DetailCarousel from '../components/DetailCarousel.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import RelatedContent from '../components/RelatedContent.jsx';
import StructuredContent from '../components/StructuredContent.jsx';
import { localizeContent, usePublicMessages } from '../i18n.js';
import { useDocumentTitle, usePageTop, usePublicDetail } from '../hooks/usePublicContent.js';
import { formatPublishedDate, getContentImages } from '../utils/content.js';

const copy = {
  vi: { loading: 'Đang tải bài viết…', error: 'Không tìm thấy hoặc chưa thể tải bài viết này.', home: 'Trang chủ', news: 'Tin tức', back: 'Quay lại tin tức', attachment: 'Tài liệu bài viết' },
  en: { loading: 'Loading article…', error: 'This article could not be found or loaded.', home: 'Home', news: 'News', back: 'Back to news', attachment: 'Article attachment' },
  'zh-tw': { loading: '正在載入文章…', error: '找不到或無法載入此文章。', home: '首頁', news: '新聞', back: '返回新聞', attachment: '文章附件' },
};

export default function NewsDetailPage({ loadPost, loadPosts }) {
  const { id } = useParams();
  const { language, t } = usePublicMessages();
  const text = copy[language] || copy.vi;
  const { data: post, status, retry } = usePublicDetail(loadPost, id);
  const localized = localizeContent(post, language);
  const publishedDate = formatPublishedDate(post?.publishedAt || post?.createdAt || post?.updatedAt);

  usePageTop();
  useDocumentTitle(localized?.title ? `${localized.title} | Chí Hùng SPG` : `${t('news')} | Chí Hùng SPG`);

  return (
    <PublicLayout>
      <article className="public-detail public-detail--article">
        {status === 'loading' && <DetailLoading label={text.loading} />}
        {status === 'error' && (
          <div className="public-container public-detail__state-wrap">
            <ContentError message={text.error} onRetry={retry} />
            <Link className="public-link-arrow" to="/#news"><span aria-hidden="true">←</span>{text.back}</Link>
          </div>
        )}

        {status === 'ready' && post && (
          <>
            <header className="public-detail__hero">
              <div className="public-container public-detail__hero-inner">
                <nav className="public-breadcrumb" aria-label={text.back}>
                  <Link to="/">{text.home}</Link><span aria-hidden="true">/</span><Link to="/#news">{text.news}</Link>
                </nav>
                <p className="public-eyebrow">{post.category || 'SPG News'}</p>
                <h1>{localized.title || t('newsFallback')}</h1>
                <div className="public-detail__byline"><span>Chí Hùng SPG</span>{publishedDate && <time dateTime={post.publishedAt || post.createdAt}>{publishedDate}</time>}</div>
              </div>
            </header>

            <div className="public-container public-article-layout">
              <DetailCarousel alt={localized.title} images={getContentImages(post)} />
              <div className="public-article-layout__body">
                {(localized.excerpt || localized.summary) && <p className="public-article-lead">{localized.excerpt || localized.summary}</p>}
                <StructuredContent
                  blocks={language === 'vi' ? post.contentBlocks : []}
                  fallbackText={localized.content || localized.description || (language === 'vi' ? post.content : '')}
                />
                <ContentAttachment item={post} label={text.attachment} />
                {loadPosts && <RelatedContent current={post} loadItems={loadPosts} type="posts" />}
                <div className="public-detail__back"><Link className="public-link-arrow" to="/#news"><span aria-hidden="true">←</span>{text.back}</Link></div>
              </div>
            </div>
          </>
        )}
      </article>
    </PublicLayout>
  );
}
