import { useEffect, useMemo, useRef, useState } from 'react';
import { CardSkeletons, ContentError } from '../components/ContentState.jsx';
import ContentCards from '../components/ContentCards.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import { usePublicLanguage } from '../i18n.js';
import { useDocumentTitle, useHashScroll, usePublicCollection } from '../hooks/usePublicContent.js';
import useScrollReveal from '../hooks/useScrollReveal.js';
import { getPublicSiteProfile, publicRealtimeUrl } from '../../../services/siteProfileService.js';
import '../../../styles/factory-home.css';

const COPY = {
  vi: {
    title: 'Chí Hùng SPG | Sản xuất giày tại Việt Nam',
    heroEyebrow: 'CHÍ HÙNG SPG · FOOTWEAR MANUFACTURING',
    heroTitle: ['Tạo nên từng bước chân.', 'Bằng kỷ luật trong từng công đoạn.'],
    heroLead: 'SPG Chí Hùng tập trung vào sản xuất giày với định hướng vận hành ổn định, kiểm soát chất lượng rõ ràng và cải tiến liên tục trong môi trường nhà máy.',
    heroPrimary: 'Khám phá năng lực sản xuất', heroSecondary: 'Cơ hội nghề nghiệp',
    trust: ['Chất lượng trong từng công đoạn', 'Phối hợp giữa các bộ phận', 'An toàn · kỷ luật · cải tiến'],
    aboutEyebrow: '01 · Về Chí Hùng SPG', aboutTitle: 'Một nhà máy giày được xây dựng từ con người, quy trình và tinh thần cải tiến.',
    aboutLead: 'Từ phát triển mẫu đến hoàn thiện sản phẩm, mỗi công đoạn đều cần sự phối hợp chính xác giữa kỹ thuật, sản xuất, chất lượng và đội ngũ vận hành.',
    aboutBody: 'Website này giới thiệu môi trường làm việc, năng lực sản xuất, hoạt động doanh nghiệp và các cơ hội nghề nghiệp tại SPG Chí Hùng. Những số liệu thực tế được quản trị viên cập nhật trực tiếp thay vì cố định trong mã nguồn.',
    capabilitiesEyebrow: '02 · Năng lực sản xuất', capabilitiesTitle: 'Từ ý tưởng sản phẩm đến đôi giày hoàn thiện.', capabilitiesLead: 'Một quy trình sản xuất giày hiệu quả cần kiểm soát vật liệu, kỹ thuật, chất lượng và tiến độ xuyên suốt.',
    capabilities: [['Phát triển mẫu & kỹ thuật','Chuẩn hóa thông tin kỹ thuật, mẫu thử và yêu cầu sản phẩm trước khi đi vào sản xuất.'],['Chuẩn bị vật tư & cắt','Sắp xếp vật tư, kiểm soát đầu vào và chuẩn bị chi tiết theo yêu cầu của từng mã sản phẩm.'],['May mũ giày','Tổ chức các công đoạn may với sự phối hợp giữa tay nghề, thiết bị và tiêu chuẩn kỹ thuật.'],['Lắp ráp & hoàn thiện','Kết nối các chi tiết, hoàn thiện hình dáng và kiểm tra sản phẩm trước khi chuyển bước cuối.'],['Kiểm soát chất lượng','Theo dõi chất lượng theo công đoạn để phát hiện vấn đề sớm và duy trì tính ổn định.']],
    processEyebrow: '03 · Hành trình một đôi giày', processTitle: 'Một đường đi rõ ràng qua từng công đoạn.', processLead: 'Các bước dưới đây mô tả cấu trúc sản xuất tổng quát; nội dung có thể được bổ sung bằng bài viết thực tế từ nhà máy.',
    process: [['01','Tiếp nhận yêu cầu','Thông tin mẫu, vật liệu và tiêu chuẩn kỹ thuật được thống nhất.'],['02','Chuẩn bị sản xuất','Vật tư, rập, công cụ và kế hoạch được chuẩn bị cho chuyền.'],['03','Cắt & may','Các chi tiết được tạo hình và lắp ghép thành phần mũ giày.'],['04','Lắp ráp','Mũ giày, đế và các thành phần được hoàn thiện theo quy trình.'],['05','Kiểm tra & hoàn thiện','Sản phẩm được kiểm tra, chỉnh sửa và hoàn thiện trước khi bàn giao.']],
    metricsEyebrow: '04 · Con số & dấu ấn', metricsTitle: 'Số liệu thực tế, cập nhật từ Admin.', metricsEmpty: 'Số liệu doanh nghiệp đang được cập nhật.',
    partnersEyebrow: '05 · Hợp tác', partnersTitle: 'Cùng tạo ra những sản phẩm tốt hơn.', partnersLead: 'Logo chỉ xuất hiện khi quản trị viên thêm trong mục Trang chủ & đối tác.',
    news: ['06 · Tin tức','Nhịp sống tại Chí Hùng SPG.','Hoạt động nhà máy, phát triển nhân tài, công đoàn và các cập nhật từ doanh nghiệp.','tin tức','Nội dung mới đang được chuẩn bị.'],
    careers: ['07 · Tuyển dụng','Cùng làm nên những bước tiến mới.','Khám phá vị trí đang tuyển và môi trường làm việc trong doanh nghiệp sản xuất giày.','vị trí tuyển dụng','Hiện chưa có vị trí tuyển dụng đang mở.'],
    loadError: 'Chưa thể tải dữ liệu. Vui lòng thử lại.',
  },
  en: {
    title: 'Chi Hung SPG | Footwear Manufacturing in Vietnam', heroEyebrow: 'CHI HUNG SPG · FOOTWEAR MANUFACTURING', heroTitle: ['Building every step.','With discipline in every process.'],
    heroLead: 'Chi Hung SPG focuses on footwear manufacturing with stable operations, clear quality control and continuous improvement across the factory environment.', heroPrimary: 'Explore manufacturing', heroSecondary: 'Career opportunities',
    trust: ['Quality at every process','Cross-functional coordination','Safety · discipline · improvement'],
    aboutEyebrow: '01 · About Chi Hung SPG', aboutTitle: 'A footwear factory built on people, process and continuous improvement.', aboutLead: 'From sample development to final finishing, every stage depends on close coordination between engineering, production, quality and operations teams.', aboutBody: 'This website presents the working environment, manufacturing capabilities, company activities and career opportunities at Chi Hung SPG. Real company figures are maintained by administrators instead of being hardcoded.',
    capabilitiesEyebrow: '02 · Manufacturing capabilities', capabilitiesTitle: 'From product idea to finished footwear.', capabilitiesLead: 'Effective footwear manufacturing requires consistent control of materials, engineering, quality and production progress.',
    capabilities: [['Sample development & engineering','Standardize technical information, samples and product requirements before production.'],['Material preparation & cutting','Prepare materials and components for each product specification.'],['Upper stitching','Coordinate craftsmanship, equipment and technical standards across stitching operations.'],['Assembly & finishing','Bring components together, shape the product and complete final finishing.'],['Quality control','Monitor quality throughout the process to identify issues early and improve stability.']],
    processEyebrow: '03 · The footwear journey', processTitle: 'A clear path through every production stage.', processLead: 'These steps describe a general footwear manufacturing structure and can be extended with real factory stories.',
    process: [['01','Requirement intake','Product, material and technical requirements are aligned.'],['02','Production preparation','Materials, patterns, tools and plans are prepared.'],['03','Cutting & stitching','Components are formed and stitched into the upper.'],['04','Assembly','Upper, sole and components are assembled and finished.'],['05','Inspection & finishing','Products are checked, corrected and finalized before handover.']],
    metricsEyebrow: '04 · Facts & highlights', metricsTitle: 'Real figures maintained from Admin.', metricsEmpty: 'Company figures are being updated.', partnersEyebrow: '05 · Partnerships', partnersTitle: 'Working together to create better products.', partnersLead: 'Partner logos appear only when configured by an administrator.',
    news: ['06 · News','Life at Chi Hung SPG.','Factory activities, talent development, union updates and company news.','news','New content is being prepared.'], careers: ['07 · Careers','Build the next step with us.','Explore open roles and the working environment in footwear manufacturing.','career opportunities','There are currently no open positions.'], loadError: 'Unable to load data. Please try again.',
  },
  'zh-tw': {
    title: '志雄 SPG | 越南鞋類製造', heroEyebrow: '志雄 SPG · 鞋類製造', heroTitle: ['打造每一步。','以每一道工序的紀律完成品質。'], heroLead: '志雄 SPG 專注於鞋類製造，重視穩定營運、清楚的品質管理與工廠現場的持續改善。', heroPrimary: '探索製造能力', heroSecondary: '職涯機會', trust: ['每道工序的品質','跨部門協作','安全 · 紀律 · 改善'],
    aboutEyebrow: '01 · 關於志雄 SPG', aboutTitle: '由人才、流程與持續改善共同打造的鞋類工廠。', aboutLead: '從樣品開發到成品完成，每個階段都需要工程、生產、品質與營運團隊精準協作。', aboutBody: '本網站介紹志雄 SPG 的工作環境、製造能力、企業活動與職涯機會。實際企業數據由管理員更新，不在程式中硬編碼。',
    capabilitiesEyebrow: '02 · 製造能力', capabilitiesTitle: '從產品概念到完整鞋品。', capabilitiesLead: '有效率的鞋類製造需要持續掌握材料、工程、品質與生產進度。', capabilities: [['樣品開發與工程','在量產前整理技術資訊、樣品與產品要求。'],['物料準備與裁切','依產品需求準備物料與各項部件。'],['鞋面車縫','結合技術、人員與設備完成鞋面相關工序。'],['組裝與完成','整合鞋面、鞋底與各部件並進行最終整理。'],['品質管理','在各製程進行品質監控，及早發現問題並提升穩定性。']],
    processEyebrow: '03 · 一雙鞋的旅程', processTitle: '清楚走過每一道生產工序。', processLead: '以下為一般鞋類製造流程，可再搭配工廠實際文章補充。', process: [['01','需求確認','確認產品、材料與技術規格。'],['02','生產準備','準備物料、紙版、工具與生產計畫。'],['03','裁切與車縫','成形各部件並完成鞋面車縫。'],['04','組裝','將鞋面、鞋底與相關部件完成組裝。'],['05','檢查與完成','進行檢查、修整與最終完成。']],
    metricsEyebrow: '04 · 數據與成果', metricsTitle: '由管理後台維護的實際數據。', metricsEmpty: '企業數據正在更新。', partnersEyebrow: '05 · 合作', partnersTitle: '共同打造更好的產品。', partnersLead: '合作夥伴標誌僅在管理員設定後顯示。',
    news: ['06 · 新聞','志雄 SPG 的日常。','工廠活動、人才發展、工會與企業最新消息。','新聞','新內容準備中。'], careers: ['07 · 人才招募','一起打造下一步。','探索鞋類製造企業的職缺與工作環境。','職缺','目前沒有開放職缺。'], loadError: '目前無法載入資料，請稍後再試。',
  },
};

function useSiteProfile() {
  const [profile, setProfile] = useState({ metrics: [], partners: [] });
  useEffect(() => {
    let active = true;
    const load = () => getPublicSiteProfile().then((payload) => {
      if (active) setProfile({ metrics: payload?.data?.metrics || [], partners: payload?.data?.partners || [] });
    }).catch(() => undefined);
    load();
    const source = new EventSource(publicRealtimeUrl());
    source.addEventListener('site-profile', load);
    return () => { active = false; source.close(); };
  }, []);
  return profile;
}

function CountUp({ value }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const target = Math.max(0, Number(value) || 0);
      if (reduced) { setDisplay(target); return; }
      const start = performance.now();
      const duration = 1200;
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);
  return <span ref={ref}>{new Intl.NumberFormat().format(display)}</span>;
}

function DynamicSection({ collection, eyebrow, id, title, intro, type, label, emptyMessage, errorMessage }) {
  return <section className={`public-section public-listing public-listing--${type}`} id={id} aria-labelledby={`${id}-title`}><div className="public-container"><div className="public-listing__heading" data-reveal="up"><div><p className="public-eyebrow">{eyebrow}</p><h2 id={`${id}-title`}>{title}</h2></div><div className="public-listing__intro"><span aria-hidden="true">↳</span><p>{intro}</p></div></div><div className="public-listing__content" data-reveal="up">{collection.status === 'loading' && <CardSkeletons />}{collection.status === 'error' && <ContentError message={errorMessage} onRetry={collection.retry} />}{collection.status === 'ready' && <ContentCards type={type} label={label} items={collection.data} emptyMessage={emptyMessage} />}</div></div></section>;
}

export default function HomePage({ loadJobs, loadPosts }) {
  const language = usePublicLanguage();
  const copy = COPY[language] || COPY.vi;
  const posts = usePublicCollection(loadPosts);
  const jobs = usePublicCollection(loadJobs);
  const profile = useSiteProfile();
  const metrics = useMemo(() => profile.metrics.filter((item) => item.enabled !== false), [profile.metrics]);
  const partners = useMemo(() => profile.partners.filter((item) => item.enabled !== false && (item.logoUrl || item.name)), [profile.partners]);
  useDocumentTitle(copy.title);
  useHashScroll();
  useScrollReveal([posts.status, jobs.status, posts.data.length, jobs.data.length, metrics.length, partners.length]);

  return <PublicLayout>
    <section className="factory-hero"><div className="public-container factory-hero__grid"><div className="factory-hero__copy" data-reveal="left"><p className="public-eyebrow">{copy.heroEyebrow}</p><h1>{copy.heroTitle[0]}<span>{copy.heroTitle[1]}</span></h1><p>{copy.heroLead}</p><div className="factory-hero__actions"><a className="public-button" href="#manufacturing">{copy.heroPrimary} ↗</a><a className="public-link-arrow" href="#careers">{copy.heroSecondary} →</a></div></div><div className="factory-shoe-map" aria-hidden="true" data-reveal="right"><svg viewBox="0 0 680 430"><path className="factory-shoe-map__outline" d="M85 284C147 264 197 209 235 153c31-46 63-70 101-57 35 12 48 60 85 79 51 27 114 20 156 64 24 25 34 63 19 91-17 31-65 38-116 37l-249-4c-88-1-154-12-172-39-10-15-2-29 26-40Z"/><path className="factory-shoe-map__route" d="M112 296C196 282 207 192 278 139c67-50 93 73 173 76 76 3 118 34 117 86"/><circle cx="112" cy="296" r="7"/><circle cx="278" cy="139" r="7"/><circle cx="451" cy="215" r="7"/><circle cx="568" cy="301" r="7"/></svg><div className="factory-shoe-map__label is-one">DESIGN</div><div className="factory-shoe-map__label is-two">CUT</div><div className="factory-shoe-map__label is-three">STITCH</div><div className="factory-shoe-map__label is-four">ASSEMBLY</div></div></div><div className="public-container factory-trust">{copy.trust.map((item) => <span key={item}>{item}</span>)}</div></section>

    <section className="public-section factory-about" id="about"><div className="public-container factory-about__grid"><div data-reveal="left"><p className="public-eyebrow">{copy.aboutEyebrow}</p><h2>{copy.aboutTitle}</h2></div><div data-reveal="right"><p className="public-section-lead">{copy.aboutLead}</p><p>{copy.aboutBody}</p></div></div></section>

    <section className="public-section factory-capabilities" id="manufacturing"><div className="public-container"><div className="factory-section-heading" data-reveal="up"><p className="public-eyebrow">{copy.capabilitiesEyebrow}</p><h2>{copy.capabilitiesTitle}</h2><p>{copy.capabilitiesLead}</p></div><div className="factory-capabilities__grid">{copy.capabilities.map(([title,text],index) => <article key={title} data-reveal="up" style={{ '--reveal-order': index }}><span>{String(index + 1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p><i>↗</i></article>)}</div></div></section>

    <section className="public-section factory-process" id="process"><div className="public-container"><div className="factory-section-heading" data-reveal="up"><p className="public-eyebrow">{copy.processEyebrow}</p><h2>{copy.processTitle}</h2><p>{copy.processLead}</p></div><div className="factory-process__map"><svg aria-hidden="true" viewBox="0 0 1000 520"><path d="M85 78 C250 80 220 205 400 205 S540 332 710 332 S790 455 930 455"/></svg>{copy.process.map(([number,title,text],index) => <article className={index % 2 ? 'is-right' : 'is-left'} key={number} style={{ '--step': index }} data-reveal={index % 2 ? 'right' : 'left'}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div></section>

    <section className="factory-metrics"><div className="public-container"><div className="factory-section-heading" data-reveal="up"><p className="public-eyebrow public-eyebrow--light">{copy.metricsEyebrow}</p><h2>{copy.metricsTitle}</h2></div>{metrics.length ? <div className="factory-metrics__grid">{metrics.map((item,index) => <article key={item.id || index} data-reveal="up" style={{ '--reveal-order': index }}><strong><CountUp value={item.value}/><small>{item.suffix}</small></strong><h3>{item.label}</h3>{item.note && <p>{item.note}</p>}</article>)}</div> : <p className="factory-metrics__empty">{copy.metricsEmpty}</p>}</div></section>

    {partners.length > 0 && <section className="factory-partners" id="partners"><div className="public-container factory-section-heading" data-reveal="up"><p className="public-eyebrow">{copy.partnersEyebrow}</p><h2>{copy.partnersTitle}</h2><p>{copy.partnersLead}</p></div><div className="factory-partners__marquee"><div>{[...partners,...partners].map((item,index) => { const body = item.logoUrl ? <img src={item.logoUrl} alt={item.name || 'Partner'}/> : <strong>{item.name}</strong>; return item.link ? <a href={item.link} target="_blank" rel="noreferrer" key={`${item.id}-${index}`}>{body}</a> : <span key={`${item.id}-${index}`}>{body}</span>; })}</div></div></section>}

    <DynamicSection collection={posts} eyebrow={copy.news[0]} id="news" title={copy.news[1]} intro={copy.news[2]} type="news" label={copy.news[3]} emptyMessage={copy.news[4]} errorMessage={copy.loadError}/>
    <DynamicSection collection={jobs} eyebrow={copy.careers[0]} id="careers" title={copy.careers[1]} intro={copy.careers[2]} type="jobs" label={copy.careers[3]} emptyMessage={copy.careers[4]} errorMessage={copy.loadError}/>
  </PublicLayout>;
}
