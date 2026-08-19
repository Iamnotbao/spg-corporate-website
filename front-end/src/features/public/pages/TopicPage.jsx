import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPosts } from '../../../services/publicService.js';
import { getPublicSiteProfile } from '../../../services/siteProfileService.js';
import GoogleMapEmbed from '../../shared/GoogleMapEmbed.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import SafeImage from '../components/SafeImage.jsx';
import { usePublicCollection, useDocumentTitle, usePageTop } from '../hooks/usePublicContent.js';
import { localizeContent, usePublicLanguage } from '../i18n.js';
import { getContentId, getExcerpt } from '../utils/content.js';
import '../../../styles/map-embed.css';
import '../../../styles/topic-page.css';

const TOPICS = {
  highlights: { category: 'achievement', vi: ['Con số & dấu ấn', 'Không gian tổng hợp những cột mốc, thành tựu, cải tiến và câu chuyện nổi bật được Chí Hùng SPG công bố.'], en: ['Facts & highlights', 'Milestones, achievements, improvements and notable stories published by Chi Hung SPG.'], 'zh-tw': ['數據與成果', '集中呈現志雄 SPG 的里程碑、成果、改善與重要故事。'] },
  partners: { category: 'partners', vi: ['Đối tác & hợp tác', 'Các bài viết về hoạt động hợp tác, phát triển sản phẩm và kết nối trong lĩnh vực sản xuất giày.'], en: ['Partners & cooperation', 'Stories about cooperation, product development and connections in footwear manufacturing.'], 'zh-tw': ['合作夥伴', '鞋類製造、產品開發與合作交流相關內容。'] },
  location: { category: 'location', vi: ['Vị trí công ty', 'Thông tin về địa điểm, không gian làm việc, nhà máy và các hoạt động tại Chí Hùng SPG.'], en: ['Company location', 'Information about Chi Hung SPG locations, workplace, factory environment and on-site activities.'], 'zh-tw': ['公司位置', '志雄 SPG 的據點、工作環境、工廠與現場活動資訊。'] },
  'supply-chain-consulting': { category: 'manufacturing', vi: ['Năng lực sản xuất', 'Nội dung chuyên sâu về phát triển mẫu, kỹ thuật, cắt, may, lắp ráp, hoàn thiện và kiểm soát chất lượng trong sản xuất giày.'], en: ['Manufacturing capabilities', 'Detailed content about sample development, engineering, cutting, stitching, assembly, finishing and footwear quality control.'], 'zh-tw': ['製造能力', '樣品開發、工程、裁切、車縫、組裝、完成與鞋類品質管理相關內容。'] },
};

export default function TopicPage() {
  const { topic } = useParams();
  const config = TOPICS[topic] || TOPICS.highlights;
  const language = usePublicLanguage();
  const copy = config[language] || config.vi;
  const posts = usePublicCollection(getPosts);
  const [location, setLocation] = useState(null);

  usePageTop();
  useDocumentTitle(`${copy[0]} | Chí Hùng SPG`);

  useEffect(() => {
    if (topic !== 'location') return undefined;
    const controller = new AbortController();
    getPublicSiteProfile({ signal: controller.signal }).then((payload) => setLocation(payload?.data?.location || null)).catch(() => {});
    return () => controller.abort();
  }, [topic]);

  const visible = posts.data.filter((item) => item?.published !== false).filter((item) => item?.category === config.category || (Array.isArray(item?.pageKeys) && item.pageKeys.includes(topic))).map((item) => localizeContent(item, language));

  return (
    <PublicLayout>
      <section className="public-topic-hero"><div className="public-container"><Link className="public-topic-back" to="/">← Chí Hùng SPG</Link><p className="public-eyebrow">FOOTWEAR · {String(topic).replaceAll('-', ' ')}</p><h1>{copy[0]}</h1><p>{copy[1]}</p></div></section>
      <section className="public-topic-content"><div className="public-container">
        {topic === 'location' && (location?.address || location?.mapsUrl) && <div className="public-topic-location-wrap"><div className="public-topic-location"><div><small>{location?.name || 'Chí Hùng SPG'}</small>{location?.address && <strong>{location.address}</strong>}</div>{location?.mapsUrl && <a href={location.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>}</div><GoogleMapEmbed name={location?.name} address={location?.address} /></div>}
        {posts.status === 'loading' && <p className="public-topic-state">Đang tải nội dung…</p>}
        {posts.status === 'error' && <p className="public-topic-state">Chưa thể tải nội dung.</p>}
        {posts.status === 'ready' && !visible.length && <div className="public-topic-empty"><strong>{copy[0]}</strong><p>Admin có thể tạo Post, chọn category “{config.category}” hoặc gán bài vào trang này để nội dung xuất hiện tại đây.</p></div>}
        {visible.length > 0 && <div className="public-topic-grid">{visible.map((item) => { const id = getContentId(item); return <Link className="public-topic-card" key={id || item.title} to={`/news/${id}`}><SafeImage src={item.imageUrl} alt={item.title || copy[0]} /><div><small>{item.category || config.category}</small><h2>{item.title}</h2><p>{getExcerpt(item, copy[1])}</p><span>→</span></div></Link>; })}</div>}
      </div></section>
    </PublicLayout>
  );
}
