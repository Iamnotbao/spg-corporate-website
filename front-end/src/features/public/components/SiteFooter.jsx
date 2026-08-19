import Brand from './Brand.jsx';
import { usePublicLanguage } from '../i18n.js';

const COPY = {
  vi: ['Sẵn sàng đồng hành?','Đưa chuỗi cung ứng của bạn đi xa hơn.','Bắt đầu trò chuyện','Giải pháp logistics linh hoạt, minh bạch và đáng tin cậy cho doanh nghiệp Việt Nam.','Khám phá','Về chúng tôi','Dịch vụ','Quy trình','Tin tức','Kết nối','Cơ hội nghề nghiệp','Gửi email','TP. Hồ Chí Minh, Việt Nam','Bảo lưu mọi quyền.','Được xây dựng cho logistics tốt hơn.'],
  en: ['Ready to move forward?','Take your supply chain further.','Start a conversation','Flexible, transparent and reliable logistics solutions for businesses in Vietnam.','Explore','About us','Services','Process','News','Connect','Career opportunities','Send email','Ho Chi Minh City, Vietnam','All rights reserved.','Built for better logistics.'],
  'zh-tw': ['準備一起前進了嗎？','讓您的供應鏈走得更遠。','開始聯絡','為越南企業提供靈活、透明且可靠的物流方案。','探索','關於我們','服務','流程','新聞','聯絡','職涯機會','寄送電子郵件','越南胡志明市','保留所有權利。','為更好的物流而打造。'],
};

export default function SiteFooter() {
  const language = usePublicLanguage();
  const c = COPY[language] || COPY.vi;
  return (
    <footer className="public-footer" id="contact">
      <div className="public-container">
        <div className="public-footer__cta"><div><p className="public-eyebrow public-eyebrow--light">{c[0]}</p><h2>{c[1]}</h2></div><a className="public-footer__cta-link" href="mailto:contact@spg.vn">{c[2]} <span aria-hidden="true">↗</span></a></div>
        <div className="public-footer__main">
          <div className="public-footer__intro"><Brand inverse /><p>{c[3]}</p><a href="mailto:contact@spg.vn">contact@spg.vn</a></div>
          <div className="public-footer__column"><p>{c[4]}</p><a href="/#about">{c[5]}</a><a href="/#services">{c[6]}</a><a href="/#process">{c[7]}</a><a href="/#news">{c[8]}</a></div>
          <div className="public-footer__column"><p>{c[9]}</p><a href="/#careers">{c[10]}</a><a href="mailto:contact@spg.vn">{c[11]}</a><span>{c[12]}</span></div>
        </div>
        <div className="public-footer__bottom"><span>© {new Date().getFullYear()} SPG. {c[13]}</span><span>{c[14]}</span></div>
      </div>
    </footer>
  );
}
