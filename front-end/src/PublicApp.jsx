import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';

const FALLBACK_IMAGE = '/images/hero.jpg';

function SafeImage({ src, alt, className, ...props }) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_IMAGE);
  const [loading, setLoading] = useState(Boolean(src));

  useEffect(() => {
    setImageSrc(src || FALLBACK_IMAGE);
    setLoading(Boolean(src));
  }, [src]);

  return (
    <div className={`image-frame ${loading ? 'is-loading' : ''}`}>
      {loading && <span className="image-loading" aria-label="Đang tải ảnh" />}
      <img
        className={className}
        src={imageSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageSrc(FALLBACK_IMAGE);
          setLoading(false);
        }}
        {...props}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="SPG trang chủ">SPG<span>.</span></Link>
        <nav className="site-nav" aria-label="Điều hướng chính">
          <a href="/#about">Về chúng tôi</a>
          <a href="/#services">Dịch vụ</a>
          <a href="/#news">Tin tức</a>
          <a href="/#careers">Tuyển dụng</a>
        </nav>
        <a className="header-cta" href="/#contact">Liên hệ <span>↗</span></a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-grid">
        <div><div className="brand footer-brand">SPG<span>.</span></div><p>Giải pháp logistics đáng tin cậy cho chuỗi cung ứng hiện đại.</p></div>
        <div><p className="footer-label">Khám phá</p><a href="/#about">Về chúng tôi</a><a href="/#services">Dịch vụ</a><a href="/#news">Tin tức</a></div>
        <div><p className="footer-label">Liên hệ</p><p>Ho Chi Minh City, Vietnam</p><p>Email: contact@spg.vn</p></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} SPG. All rights reserved.</span><span>Built for better logistics.</span></div>
    </footer>
  );
}

export default function PublicApp() {
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getPosts(), api.getJobs()])
      .then(([postData, jobData]) => {
        if (cancelled) return;
        setPosts(Array.isArray(postData) ? postData.slice(0, 3) : []);
        setJobs(Array.isArray(jobData) ? jobData.slice(0, 3) : []);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return <>
    <Header />
    <main>
      <section className="hero-section"><div className="container hero-grid"><div><p className="eyebrow">SPG LOGISTICS</p><h1>Kết nối hàng hóa.<br />Mở rộng tương lai.</h1><p className="hero-copy">Chúng tôi cung cấp các giải pháp logistics linh hoạt, hiệu quả và đáng tin cậy cho doanh nghiệp Việt Nam.</p><a className="button button-primary" href="/#services">Khám phá dịch vụ <span>↗</span></a></div><div className="hero-visual" role="img" aria-label="SPG logistics" /></div></section>
      <section className="section about-section" id="about"><div className="container about-grid"><div className="about-image"><SafeImage src="/images/about.jpg" alt="Hoạt động logistics của SPG" /></div><div><p className="eyebrow">VỀ SPG</p><h2>Di chuyển đúng hướng.</h2><p>SPG đồng hành cùng doanh nghiệp trong từng chặng đường vận chuyển, từ lập kế hoạch đến giao hàng cuối cùng.</p><a className="text-link" href="/#contact">Tìm hiểu thêm <span>↗</span></a></div></div></section>
      <section className="section services-section" id="services"><div className="container"><div className="section-heading"><div><p className="eyebrow">NĂNG LỰC</p><h2>Dịch vụ được<br />thiết kế cho bạn.</h2></div></div><div className="service-grid"><article><span>01</span><h3>Vận tải hàng hóa</h3><p>Giải pháp vận tải nội địa an toàn, đúng hẹn và tối ưu chi phí.</p></article><article><span>02</span><h3>Kho bãi & phân phối</h3><p>Quản lý hàng hóa linh hoạt với mạng lưới kho bãi hiệu quả.</p></article><article><span>03</span><h3>Giải pháp chuỗi cung ứng</h3><p>Tư vấn và vận hành chuỗi cung ứng phù hợp với mục tiêu tăng trưởng.</p></article></div></div></section>
      <section className="section news-section" id="news"><div className="container"><div className="section-heading"><div><p className="eyebrow">TIN TỨC</p><h2>Cập nhật từ SPG.</h2></div></div>{loading && <div className="loading-state">Đang tải nội dung...</div>}{error && !loading && <div className="alert error">Không thể tải nội dung. Vui lòng thử lại sau.</div>} {!loading && !error && <div className="article-grid">{posts.map((post) => <Link className="article-card" to={`/news/${post._id}`} key={post._id}><SafeImage src={post.imageUrl} alt={post.title} /><div><p className="eyebrow">SPG NEWS</p><h3>{post.title}</h3><p>{post.excerpt}</p><span>Đọc thêm ↗</span></div></Link>)}{posts.length === 0 && <div className="empty">Chưa có bài viết.</div>}</div>}</div></section>
      <section className="section careers-section" id="careers"><div className="container"><div className="section-heading"><div><p className="eyebrow">CƠ HỘI NGHỀ NGHIỆP</p><h2>Cùng nhau<br />tiến về phía trước.</h2></div></div>{loading && <div className="loading-state">Đang tải vị trí tuyển dụng...</div>}{!loading && <div className="job-grid">{jobs.map((job) => <Link className="job-card" to={`/careers/${job._id}`} key={job._id}><h3>{job.title}</h3><p>{job.description}</p><span>{job.location || 'Vietnam'} · {job.type || 'Full-time'} ↗</span></Link>)}{jobs.length === 0 && <div className="empty">Hiện chưa có vị trí tuyển dụng.</div>}</div>}</div></section>
    </main>
    <Footer />
  </>;
}
