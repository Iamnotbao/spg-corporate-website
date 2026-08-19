import { Link, useParams } from 'react-router-dom';
import { getPosts } from '../../../services/publicService.js';
import PublicLayout from '../components/PublicLayout.jsx';
import SafeImage from '../components/SafeImage.jsx';
import { usePublicCollection, useDocumentTitle, usePageTop } from '../hooks/usePublicContent.js';
import { localizeContent, usePublicLanguage } from '../i18n.js';
import { getContentId, getExcerpt } from '../utils/content.js';
import '../../../styles/topic-page.css';

const TOPICS = {
  highlights: {
    category: 'achievement',
    vi: ['Con số & dấu ấn', 'Không gian tổng hợp các cột mốc, thành tựu và nội dung nổi bật được SPG công bố.'],
    en: ['Highlights & milestones', 'A dedicated space for milestones, achievements and notable updates published by SPG.'],
    'zh-tw': ['數據與里程碑', '集中呈現 SPG 公開的里程碑、成果與重要內容。'],
  },
  partners: {
    category: 'partners',
    vi: ['Đối tác & hợp tác', 'Nơi tập hợp các bài viết về hoạt động hợp tác và kết nối doanh nghiệp.'],
    en: ['Partners & cooperation', 'Stories and updates about cooperation and business connections.'],
    'zh-tw': ['合作夥伴', '彙整合作、交流與企業連結相關內容。'],
  },
  location: {
    category: 'location',
    vi: ['Vị trí công ty', 'Thông tin và bài viết liên quan đến địa điểm, không gian và hoạt động tại các cơ sở của SPG.'],
    en: ['Company locations', 'Information and posts related to SPG locations, workplaces and on-site activities.'],
    'zh-tw': ['公司位置', 'SPG 據點、工作環境與現場活動相關資訊。'],
  },
  'supply-chain-consulting': {
    category: 'supply-chain-consulting',
    vi: ['Tư vấn chuỗi cung ứng', 'Các góc nhìn, quy trình và nội dung chuyên môn về tư vấn chuỗi cung ứng.'],
    en: ['Supply chain consulting', 'Insights, processes and professional content about supply chain consulting.'],
    'zh-tw': ['供應鏈顧問', '供應鏈顧問相關觀點、流程與專業內容。'],
  },
};

export default function TopicPage() {
  const { topic } = useParams();
  const config = TOPICS[topic] || TOPICS.highlights;
  const language = usePublicLanguage();
  const copy = config[language] || config.vi;
  const posts = usePublicCollection(getPosts);

  usePageTop();
  useDocumentTitle(`${copy[0]} | SPG Logistics`);

  const visible = posts.data
    .filter((item) => item?.published !== false)
    .filter((item) => item?.category === config.category || (Array.isArray(item?.pageKeys) && item.pageKeys.includes(topic)))
    .map((item) => localizeContent(item, language));

  return (
    <PublicLayout>
      <section className="public-topic-hero">
        <div className="public-container">
          <Link className="public-topic-back" to="/">← SPG</Link>
          <p className="public-eyebrow">SPG · {String(topic).replaceAll('-', ' ')}</p>
          <h1>{copy[0]}</h1>
          <p>{copy[1]}</p>
        </div>
      </section>

      <section className="public-topic-content">
        <div className="public-container">
          {posts.status === 'loading' && <p className="public-topic-state">Đang tải nội dung…</p>}
          {posts.status === 'error' && <p className="public-topic-state">Chưa thể tải nội dung.</p>}
          {posts.status === 'ready' && !visible.length && (
            <div className="public-topic-empty">
              <strong>{copy[0]}</strong>
              <p>Admin có thể tạo bài Post và chọn category “{config.category}” để bài tự xuất hiện tại trang này.</p>
            </div>
          )}
          {visible.length > 0 && (
            <div className="public-topic-grid">
              {visible.map((item) => {
                const id = getContentId(item);
                return (
                  <Link className="public-topic-card" key={id || item.title} to={`/news/${id}`}>
                    <SafeImage src={item.imageUrl} alt={item.title || copy[0]} />
                    <div>
                      <small>{item.category || config.category}</small>
                      <h2>{item.title}</h2>
                      <p>{getExcerpt(item, copy[1])}</p>
                      <span>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
