import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VideoPlayer from '../../videos/components/VideoPlayer.jsx';
import { listVideos } from '../../videos/services/videoService.js';
import '../styles/home-product.css';

const RESOURCES = [
  { level: 'HSK 1', character: '一', title: 'Bộ khởi động', copy: 'Từ vựng nền, mẫu câu ngắn và gợi ý luyện từng ngày.' },
  { level: 'HSK 2', character: '二', title: 'Bộ củng cố', copy: 'Mở rộng ngữ cảnh nghe, đọc và ôn tập theo chủ điểm.' },
  { level: 'HSK 3', character: '三', title: 'Bộ chuyển tiếp', copy: 'Tài nguyên demo cho giai đoạn tiến tới nội dung trung cấp.' },
];
const PLANS = [
  { name: 'Free', price: '0đ', copy: 'Khám phá nội dung công khai và lộ trình Hanyora.', action: 'Bắt đầu học', to: '/courses' },
  { name: 'Standard', price: 'Sắp ra mắt', copy: 'Bản trình bày tính năng; chưa có thanh toán hay đăng ký gói.', action: 'Xem tính năng' },
  { name: 'Premium', price: 'Sắp ra mắt', copy: 'Bản trình bày tính năng; chưa có thanh toán hay đăng ký gói.', action: 'Xem tính năng' },
];
const TESTIMONIALS = [
  { avatar: '新', label: 'Người học mới · Tình huống demo', quote: 'Tôi muốn biết hôm nay nên học bài nào và tiếp tục từ đúng chỗ đã dừng.' },
  { avatar: '考', label: 'Người ôn HSK · Tình huống demo', quote: 'Tôi cần nhìn riêng phần nghe và đọc để biết nội dung nào nên ôn lại.' },
  { avatar: '忙', label: 'Người học bận rộn · Tình huống demo', quote: 'Tôi muốn một phiên học ngắn, rõ bước tiếp theo và không bị phân tán.' },
];

export default function HomeProductSections() {
  const [video, setVideo] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    listVideos({ featured: true, pageSize: 1, signal: controller.signal })
      .then((response) => setVideo(response.data?.[0] || null))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return <>
    <section className="home-section home-product-video" aria-labelledby="home-video-title"><div className="public-container home-product-video__grid"><div><p className="public-eyebrow">Học bằng ngữ cảnh</p><h2 id="home-video-title">Xem, nghe và nối kiến thức vào bài học.</h2><p>Video nổi bật được quản lý từ Admin và tự phát ở chế độ tắt tiếng. Bạn có thể bật âm thanh khi muốn học nghe.</p><Link className="text-link" to="/videos">Xem thư viện video <span aria-hidden="true">→</span></Link></div><div className="home-product-video__player">{video ? <VideoPlayer video={video} title={`Video nổi bật: ${video.title}`} /> : <div className="home-product-video__placeholder"><span lang="zh-Hans">影</span><strong>Video Hanyora nổi bật</strong><small>Admin có thể chọn một video đã xuất bản cho khu vực này.</small></div>}</div></div></section>
    <section className="home-section home-exam-cta"><div className="public-container home-exam-cta__inner"><div><p className="public-eyebrow">HSK Mock Test</p><h2>Đo điểm xuất phát trước khi lên kế hoạch học.</h2><p>Làm đề luyện tập có đồng hồ, chấm điểm trên máy chủ và kết quả theo từng phần nghe, đọc.</p></div><Link className="button button--primary" to="/hsk-mock-tests">Thi thử HSK</Link></div></section>
    <section className="home-section" aria-labelledby="home-resources-title"><div className="public-container"><div className="home-section-heading"><div><p className="public-eyebrow">Tài nguyên Hanyora</p><h2 id="home-resources-title">Bộ học liệu demo theo từng cấp.</h2></div></div><p className="home-demo-label">Bìa minh họa nguyên bản bằng CSS; không sử dụng ảnh quét sách có bản quyền.</p><div className="home-resource-grid">{RESOURCES.map((item) => <article key={item.level}><div className="home-resource-cover"><small>HANYORA</small><strong lang="zh-Hans">{item.character}</strong><span>{item.level}</span></div><div><span>{item.level}</span><h3>{item.title}</h3><p>{item.copy}</p><Link to="/courses">Xem lộ trình →</Link></div></article>)}</div></div></section>
    <section className="home-section home-testimonials" aria-labelledby="home-testimonials-title"><div className="public-container"><div className="home-section-heading"><div><p className="public-eyebrow">Trải nghiệm minh họa</p><h2 id="home-testimonials-title">Những tình huống học tập Hanyora hướng tới.</h2></div></div><p className="home-demo-label">Hình và nội dung dưới đây chỉ là minh họa giao diện, không phải lời chứng thực của người thật.</p><div className="home-testimonial-grid">{TESTIMONIALS.map((item) => <article key={item.label}><div className="home-testimonial-person"><span className="home-testimonial-avatar" aria-hidden="true">{item.avatar}</span><span>{item.label}</span></div><blockquote>“{item.quote}”</blockquote></article>)}</div></div></section>
    <section className="home-section home-pricing" aria-labelledby="home-pricing-title"><div className="public-container"><div className="home-section-heading"><div><p className="public-eyebrow">Pricing demo</p><h2 id="home-pricing-title">Chọn cách khám phá Hanyora.</h2></div></div><p className="home-demo-label">Giao diện minh họa chỉ để xem; chưa có thanh toán, đăng ký gói hoặc gia hạn.</p><div className="home-pricing-grid">{PLANS.map((plan, index) => <article className={index === 1 ? 'is-featured' : ''} key={plan.name}><span>{plan.name}</span><strong>{plan.price}</strong><p>{plan.copy}</p>{plan.to ? <Link className="button button--primary" to={plan.to}>{plan.action}</Link> : <button className="button button--secondary" disabled type="button">{plan.action}</button>}</article>)}</div></div></section>
  </>;
}
