import Brand from './Brand.jsx';
import { usePublicLanguage } from '../i18n.js';

const COPY = {
  vi: ['Muốn tìm hiểu thêm về Chí Hùng SPG?','Kết nối với doanh nghiệp sản xuất giày và đội ngũ tuyển dụng của chúng tôi.','Bắt đầu trò chuyện','Thông tin về sản xuất giày, môi trường làm việc, hoạt động doanh nghiệp và cơ hội nghề nghiệp tại Chí Hùng SPG.','Khám phá','Về chúng tôi','Sản xuất','Quy trình','Tin tức','Kết nối','Cơ hội nghề nghiệp','Gửi email','Việt Nam','Bảo lưu mọi quyền.','Cùng tạo nên những bước tiến tốt hơn.'],
  en: ['Want to learn more about Chi Hung SPG?','Connect with our footwear manufacturing company and recruitment team.','Start a conversation','Footwear manufacturing, workplace, company activities and career opportunities at Chi Hung SPG.','Explore','About us','Manufacturing','Process','News','Connect','Career opportunities','Send email','Vietnam','All rights reserved.','Building better steps together.'],
  'zh-tw': ['想進一步了解志雄 SPG？','與我們的鞋類製造企業及招募團隊聯絡。','開始聯絡','了解志雄 SPG 的鞋類製造、工作環境、企業活動與職涯機會。','探索','關於我們','製造','流程','新聞','聯絡','職涯機會','寄送電子郵件','越南','保留所有權利。','一起打造更好的每一步。'],
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
          <div className="public-footer__column"><p>{c[4]}</p><a href="/#about">{c[5]}</a><a href="/#manufacturing">{c[6]}</a><a href="/#process">{c[7]}</a><a href="/#news">{c[8]}</a></div>
          <div className="public-footer__column"><p>{c[9]}</p><a href="/#careers">{c[10]}</a><a href="mailto:contact@spg.vn">{c[11]}</a><span>{c[12]}</span></div>
        </div>
        <div className="public-footer__bottom"><span>© {new Date().getFullYear()} Chí Hùng SPG. {c[13]}</span><span>{c[14]}</span></div>
      </div>
    </footer>
  );
}
