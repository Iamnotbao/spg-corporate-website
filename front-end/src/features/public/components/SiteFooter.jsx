import Brand from './Brand.jsx';

export default function SiteFooter() {
  return (
    <footer className="public-footer" id="contact">
      <div className="public-container">
        <div className="public-footer__cta">
          <div>
            <p className="public-eyebrow public-eyebrow--light">Sẵn sàng đồng hành?</p>
            <h2>Đưa chuỗi cung ứng của bạn đi xa hơn.</h2>
          </div>
          <a className="public-footer__cta-link" href="mailto:contact@spg.vn">
            Bắt đầu trò chuyện
            <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="public-footer__main">
          <div className="public-footer__intro">
            <Brand inverse />
            <p>
              Giải pháp logistics linh hoạt, minh bạch và đáng tin cậy cho doanh nghiệp
              Việt Nam.
            </p>
            <a href="mailto:contact@spg.vn">contact@spg.vn</a>
          </div>

          <div className="public-footer__column">
            <p>Khám phá</p>
            <a href="/#about">Về chúng tôi</a>
            <a href="/#services">Dịch vụ</a>
            <a href="/#process">Quy trình</a>
            <a href="/#news">Tin tức</a>
          </div>

          <div className="public-footer__column">
            <p>Kết nối</p>
            <a href="/#careers">Cơ hội nghề nghiệp</a>
            <a href="mailto:contact@spg.vn">Gửi email</a>
            <span>TP. Hồ Chí Minh, Việt Nam</span>
          </div>
        </div>

        <div className="public-footer__bottom">
          <span>© {new Date().getFullYear()} SPG. All rights reserved.</span>
          <span>Built for better logistics.</span>
        </div>
      </div>
    </footer>
  );
}
