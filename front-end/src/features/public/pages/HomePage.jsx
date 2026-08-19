import { CardSkeletons, ContentError } from '../components/ContentState.jsx';
import ContentCards from '../components/ContentCards.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import { usePublicLanguage } from '../i18n.js';
import {
  useDocumentTitle,
  useHashScroll,
  usePublicCollection,
} from '../hooks/usePublicContent.js';
import useScrollReveal from '../hooks/useScrollReveal.js';

const COPY = {
  vi: {
    title: 'SPG Logistics | Kết nối hàng hóa, mở rộng tương lai',
    hero: ['Kết nối hàng hóa.', 'Mở rộng tương lai.', 'Chúng tôi kiến tạo giải pháp logistics linh hoạt, hiệu quả và minh bạch để doanh nghiệp an tâm trên từng chặng đường.', 'Khám phá dịch vụ', 'Câu chuyện SPG'],
    network: ['Điểm đi', 'Điểm đến', 'Đúng nơi · Đúng lúc', 'Hành trình đang được kết nối', 'Một hành trình liền mạch', 'Tiếp nhận', 'Điều phối', 'Hoàn tất'],
    trust: ['Vận hành có trách nhiệm', 'Một đầu mối xuyên suốt', 'Phản hồi nhanh chóng'],
    about: ['01 · Về chúng tôi', 'Logistics được xây dựng trên sự tin cậy.', 'SPG đồng hành cùng doanh nghiệp bằng tư duy thực tế, khả năng thích ứng và cam kết rõ ràng trong từng khâu vận hành.', 'Chúng tôi hiểu rằng mỗi lô hàng đều gắn với một kế hoạch kinh doanh. Vì vậy, đội ngũ SPG tập trung vào giao tiếp minh bạch, phối hợp chủ động và giải pháp vừa vặn với nhu cầu thực tế.', 'Trao đổi cùng chúng tôi', 'Chúng tôi không chỉ di chuyển hàng hóa — chúng tôi giữ cho kế hoạch của khách hàng luôn tiếp tục chuyển động.', 'Quan điểm vận hành tại SPG'],
    principles: [['Đáng tin cậy','Cam kết rõ ràng, phối hợp nhất quán và theo sát hành trình.'],['Linh hoạt','Chủ động thích ứng với yêu cầu riêng và thay đổi trong vận hành.'],['Đồng hành','Lấy mục tiêu dài hạn của khách hàng làm trọng tâm cho mọi giải pháp.']],
    highlights: ['02 · Dấu ấn vận hành', 'Một cấu trúc gọn.', 'Một cam kết dài hạn.', 'Những con số dưới đây phản ánh cách SPG đang tổ chức dịch vụ và phối hợp công việc — rõ ràng, tập trung và luôn có thể cải tiến.'],
    highlightItems: [['01','đầu mối','Phối hợp xuyên suốt','Thông tin được kết nối rõ ràng trong toàn bộ hành trình.'],['03','nhóm giải pháp','Năng lực trọng tâm','Vận tải, kho vận và tư vấn cùng hỗ trợ một mục tiêu chung.'],['04','bước vận hành','Quy trình dễ theo dõi','Từ tiếp nhận đến cải tiến đều có định hướng cụ thể.'],['∞','tinh thần','Không ngừng cải tiến','Mỗi phản hồi là một cơ hội để hành trình tiếp theo tốt hơn.']],
    journey: ['03 · Hành trình phát triển', 'Từng bước trưởng thành cùng nhu cầu doanh nghiệp.', 'Mỗi giai đoạn là một bước hoàn thiện năng lực, nhưng tinh thần đồng hành vẫn luôn là điểm bắt đầu của mọi quyết định.'],
    milestones: [['Giai đoạn khởi đầu','Hình thành từ một nhu cầu rất thực tế.','SPG đặt nền móng từ mong muốn giúp doanh nghiệp vận chuyển hàng hóa rõ ràng hơn, chủ động hơn và an tâm hơn.'],['Giai đoạn phát triển','Mở rộng năng lực theo từng hành trình.','Từ giao nhận, hoạt động dần được kết nối với kho bãi, phân phối và tư vấn để đáp ứng nhiều bài toán vận hành hơn.'],['Giai đoạn hoàn thiện','Chuẩn hóa cách phối hợp.','Quy trình được tổ chức quanh một đầu mối xuyên suốt, thông tin minh bạch và phản hồi kịp thời giữa các bên.'],['Chặng đường tiếp theo','Tiếp tục tiến về phía trước.','SPG theo đuổi tinh thần cải tiến liên tục, sẵn sàng thích ứng cùng nhu cầu mới của khách hàng và thị trường.']],
    services: ['04 · Dịch vụ', 'Giải pháp cho từng chặng vận hành.', 'Từ nhu cầu đơn lẻ đến chuỗi vận hành nhiều điểm, SPG thiết kế phương án hướng tới hiệu quả và khả năng kiểm soát.'],
    serviceItems: [['Vận tải & giao nhận','Điều phối linh hoạt cho từng lô hàng, từ điểm xuất phát đến nơi giao nhận cuối cùng.','Kết nối đa phương thức'],['Kho bãi & phân phối','Tổ chức lưu kho và luân chuyển hàng hóa rõ ràng, phù hợp với nhịp độ vận hành thực tế.','Tối ưu dòng hàng'],['Tư vấn chuỗi cung ứng','Đồng hành rà soát quy trình, nhận diện điểm nghẽn và xây dựng phương án vận hành phù hợp.','Giải pháp theo nhu cầu']],
    process: ['05 · Quy trình', 'Rõ ràng từ bước đầu tiên.', 'Một quy trình gọn, dễ theo dõi giúp đội ngũ hai bên phối hợp nhanh và đưa ra quyết định đúng lúc.'],
    steps: [['Tiếp nhận','Lắng nghe mục tiêu, đặc thù hàng hóa và yêu cầu vận hành của doanh nghiệp.'],['Thiết kế','Xây dựng phương án phù hợp về tuyến đường, thời gian và nguồn lực.'],['Triển khai','Điều phối từng chặng với một đầu mối hỗ trợ xuyên suốt.'],['Cải tiến','Theo dõi kết quả, phản hồi nhanh và liên tục tối ưu cách vận hành.']],
    news: ['06 · Tin tức','Cập nhật từ SPG.','Câu chuyện, góc nhìn và những cập nhật mới từ đội ngũ SPG.','tin tức','Nội dung mới đang được chuẩn bị. Vui lòng quay lại sau.'],
    careers: ['07 · Cơ hội nghề nghiệp','Cùng nhau tiến về phía trước.','Tìm nơi bạn có thể học hỏi, đóng góp và cùng chúng tôi tạo nên những hành trình tốt hơn.','vị trí tuyển dụng','Hiện chưa có vị trí tuyển dụng đang mở.'],
    careerPromise: ['Nơi mỗi đóng góp đều tạo ra chuyển động.','Học hỏi trong công việc','Phối hợp cởi mở','Cùng nhau phát triển'],
    loadError: 'Chưa thể tải dữ liệu. Vui lòng thử lại.',
  },
  en: {
    title: 'SPG Logistics | Connecting cargo, expanding possibilities',
    hero: ['Connecting cargo.', 'Expanding possibilities.', 'We build flexible, efficient and transparent logistics solutions so businesses can move with confidence at every stage.', 'Explore services', 'Our SPG story'],
    network: ['Origin', 'Destination', 'Right place · Right time', 'Journey connected', 'One seamless journey', 'Receive', 'Coordinate', 'Complete'],
    trust: ['Responsible operations', 'One accountable contact', 'Fast response'],
    about: ['01 · About us', 'Logistics built on trust.', 'SPG works alongside businesses with practical thinking, adaptability and clear commitments throughout operations.', 'Every shipment is tied to a business plan. That is why our team focuses on transparent communication, proactive coordination and solutions that fit real operational needs.', 'Talk with us', 'We do more than move cargo — we help keep our customers’ plans moving forward.', 'How SPG operates'],
    principles: [['Reliable','Clear commitments, consistent coordination and close follow-through.'],['Flexible','Adapt proactively to specific needs and changing operations.'],['Together','Keep customers’ long-term goals at the center of every solution.']],
    highlights: ['02 · Operating highlights', 'A focused structure.', 'A long-term commitment.', 'These figures describe how SPG organizes services and coordination — clearly, with focus and room to improve.'],
    highlightItems: [['01','contact','End-to-end coordination','Information stays connected throughout the journey.'],['03','solution groups','Core capabilities','Transport, warehousing and consulting support one shared goal.'],['04','operating steps','Easy-to-follow process','From intake to improvement, every step has a clear direction.'],['∞','mindset','Continuous improvement','Every piece of feedback is a chance to make the next journey better.']],
    journey: ['03 · Our journey', 'Growing with business needs.', 'Each stage strengthens our capabilities while partnership remains the starting point for every decision.'],
    milestones: [['Starting stage','Built from a practical need.','SPG began with the goal of helping businesses move goods with greater clarity, control and confidence.'],['Growth stage','Expanding capabilities journey by journey.','Forwarding gradually connected with warehousing, distribution and consulting to solve more operational needs.'],['Maturing stage','Standardizing how we coordinate.','Processes are organized around one accountable point of contact, transparent information and timely feedback.'],['What comes next','Keep moving forward.','SPG continues to improve and adapt to new customer and market needs.']],
    services: ['04 · Services', 'Solutions for every operating stage.', 'From a single requirement to multi-point operations, SPG designs solutions for efficiency and control.'],
    serviceItems: [['Transport & forwarding','Flexible coordination for every shipment, from origin to final delivery.','Multimodal connection'],['Warehousing & distribution','Clear storage and movement of goods aligned with real operating rhythms.','Flow optimization'],['Supply chain consulting','Review processes, identify bottlenecks and build practical operating solutions.','Solutions by need']],
    process: ['05 · Process', 'Clear from the first step.', 'A concise, visible process helps both teams coordinate faster and make timely decisions.'],
    steps: [['Receive','Understand goals, cargo characteristics and operational requirements.'],['Design','Build the right plan for routes, time and resources.'],['Execute','Coordinate every stage through one continuous support point.'],['Improve','Track results, respond quickly and continuously optimize operations.']],
    news: ['06 · News','Updates from SPG.','Stories, perspectives and the latest updates from the SPG team.','news','New content is being prepared. Please check back later.'],
    careers: ['07 · Careers','Move forward together.','Find a place where you can learn, contribute and help create better journeys with us.','career opportunities','There are currently no open positions.'],
    careerPromise: ['Every contribution creates movement.','Learn through work','Open collaboration','Grow together'],
    loadError: 'Unable to load data. Please try again.',
  },
  'zh-tw': {
    title: 'SPG Logistics | 連結貨運，拓展未來',
    hero: ['連結貨運。', '拓展未來。', '我們打造靈活、高效且透明的物流方案，讓企業在每一段旅程都能安心前進。', '探索服務', 'SPG 的故事'],
    network: ['起點', '目的地', '準時 · 到位', '旅程連線中', '一段順暢旅程', '接收', '協調', '完成'],
    trust: ['負責任的營運', '單一聯絡窗口', '快速回應'],
    about: ['01 · 關於我們', '以信任為基礎的物流。', 'SPG 以務實思維、靈活應變與清楚承諾陪伴企業完成每個營運環節。', '我們了解每批貨物都連結著企業計畫，因此重視透明溝通、主動協調與真正符合需求的方案。', '與我們聯絡', '我們不只移動貨物，也讓客戶的計畫持續前進。', 'SPG 的營運理念'],
    principles: [['可靠','清楚承諾、一致協作並持續追蹤。'],['靈活','主動因應個別需求與營運變化。'],['同行','以客戶的長期目標為每個方案的核心。']],
    highlights: ['02 · 營運亮點', '精簡的架構。', '長期的承諾。', '這些數字反映 SPG 如何組織服務與協作：清楚、專注並持續改善。'],
    highlightItems: [['01','窗口','全程協作','資訊在整段旅程中保持連結與透明。'],['03','方案類別','核心能力','運輸、倉儲與顧問服務共同支持同一目標。'],['04','營運步驟','容易追蹤的流程','從接收到改善，每一步都有清楚方向。'],['∞','精神','持續改善','每一次回饋都是讓下一段旅程更好的機會。']],
    journey: ['03 · 發展歷程', '隨企業需求持續成長。', '每個階段都提升能力，而同行合作始終是所有決策的起點。'],
    milestones: [['起步階段','從實際需求出發。','SPG 從協助企業更清楚、更主動且更安心地運送貨物開始。'],['成長階段','隨每段旅程擴展能力。','從貨運逐步串接倉儲、配送與顧問服務，回應更多營運需求。'],['成熟階段','標準化協作方式。','流程以單一窗口、透明資訊與即時回饋為核心。'],['下一段旅程','持續向前。','SPG 持續改善並因應客戶與市場的新需求。']],
    services: ['04 · 服務', '每個營運階段都有合適方案。', '從單一需求到多點營運，SPG 以效率與可控性為目標設計方案。'],
    serviceItems: [['運輸與貨運','從起點到最終交付，為每批貨物提供靈活協調。','多式聯運'],['倉儲與配送','依實際營運節奏，清楚管理貨物儲存與流轉。','優化貨物流'],['供應鏈顧問','檢視流程、找出瓶頸並建立合適的營運方案。','依需求設計']],
    process: ['05 · 流程', '從第一步就清楚。', '精簡且容易追蹤的流程，讓雙方更快協作並及時做出決策。'],
    steps: [['接收','了解企業目標、貨物特性與營運需求。'],['設計','依路線、時間與資源建立合適方案。'],['執行','透過單一支援窗口協調每個階段。'],['改善','追蹤成果、快速回應並持續優化營運方式。']],
    news: ['06 · 新聞','SPG 最新消息。','來自 SPG 團隊的故事、觀點與最新動態。','新聞','新內容正在準備中，請稍後再回來查看。'],
    careers: ['07 · 人才招募','一起向前。','找到一個能學習、貢獻並與我們一起打造更好旅程的地方。','職缺','目前沒有開放中的職缺。'],
    careerPromise: ['每一份貢獻都能創造前進的力量。','從工作中學習','開放協作','一起成長'],
    loadError: '暫時無法載入資料，請稍後再試。',
  },
};

function HeroSection({ c }) { return <section className="public-hero" aria-labelledby="public-hero-title"><div className="public-container public-hero__grid"><div className="public-hero__content" data-reveal="left"><p className="public-eyebrow">SPG Logistics · Vietnam</p><h1 id="public-hero-title">{c.hero[0]}<span>{c.hero[1]}</span></h1><p className="public-hero__lead">{c.hero[2]}</p><div className="public-hero__actions"><a className="public-button" href="/#services">{c.hero[3]} <span aria-hidden="true">↗</span></a><a className="public-link-arrow" href="/#journey">{c.hero[4]} <span aria-hidden="true">→</span></a></div></div><div className="public-network" aria-hidden="true" data-reveal="right"><div className="public-network__grid"/><span className="public-network__route public-network__route--one"/><span className="public-network__route public-network__route--two"/><span className="public-network__node public-network__node--one"/><span className="public-network__node public-network__node--two"/><span className="public-network__node public-network__node--three"/><div className="public-network__label public-network__label--origin"><small>{c.network[0]}</small><strong>Ho Chi Minh City</strong></div><div className="public-network__label public-network__label--destination"><small>{c.network[1]}</small><strong>{c.network[2]}</strong></div><div className="public-network__status"><span/>{c.network[3]}</div><div className="public-network__card"><small>SPG CONTROL</small><strong>{c.network[4]}</strong><div><span>{c.network[5]}</span><i/><span>{c.network[6]}</span><i/><span>{c.network[7]}</span></div></div></div></div><div className="public-container public-hero__trust-line" data-reveal="up">{c.trust.map((x)=><span key={x}>{x}</span>)}</div></section>; }
function AboutSection({ c }) { return <section className="public-section public-about" id="about" aria-labelledby="about-title"><div className="public-container public-about__grid"><div data-reveal="left"><p className="public-eyebrow">{c.about[0]}</p><h2 id="about-title">{c.about[1]}</h2></div><div className="public-about__copy" data-reveal="right"><p className="public-section-lead">{c.about[2]}</p><p>{c.about[3]}</p><a className="public-link-arrow" href="/#contact">{c.about[4]} <span aria-hidden="true">→</span></a></div></div><div className="public-container public-about__statement" data-reveal="up"><div className="public-about__statement-mark" aria-hidden="true">“</div><p>{c.about[5]}</p><span>{c.about[6]}</span></div><div className="public-container public-about__principles">{c.principles.map((p,i)=><article key={p[0]} data-reveal="up" style={{'--reveal-order':i}}><span>{String(i+1).padStart(2,'0')}</span><h3>{p[0]}</h3><p>{p[1]}</p><i aria-hidden="true">↗</i></article>)}</div></section>; }
function Highlights({ c }) { return <section className="public-proof" aria-labelledby="operating-highlights-title"><div className="public-container"><div className="public-proof__heading" data-reveal="up"><p className="public-eyebrow public-eyebrow--light">{c.highlights[0]}</p><h2 id="operating-highlights-title">{c.highlights[1]}<span>{c.highlights[2]}</span></h2><p>{c.highlights[3]}</p></div><dl className="public-proof__grid">{c.highlightItems.map((x,i)=><div key={i} data-reveal="up" style={{'--reveal-order':i}}><dt><strong>{x[0]}</strong><span>{x[1]}</span></dt><dd><strong>{x[2]}</strong><span>{x[3]}</span></dd></div>)}</dl></div></section>; }
function Journey({ c }) { return <section className="public-section public-journey" id="journey" aria-labelledby="journey-title"><div className="public-container"><div className="public-journey__heading" data-reveal="up"><p className="public-eyebrow">{c.journey[0]}</p><h2 id="journey-title">{c.journey[1]}</h2><p>{c.journey[2]}</p></div><ol className="public-timeline">{c.milestones.map((m,i)=><li key={i}><article className="public-timeline__card" data-reveal={i%2===0?'left':'right'}><p>{m[0]}</p><h3>{m[1]}</h3><span>{m[2]}</span></article><div className="public-timeline__marker" aria-hidden="true"><span>{String(i+1).padStart(2,'0')}</span></div></li>)}</ol></div></section>; }
function Services({ c }) { return <section className="public-section public-services" id="services" aria-labelledby="services-title"><div className="public-container"><div className="public-section-heading" data-reveal="up"><div><p className="public-eyebrow public-eyebrow--light">{c.services[0]}</p><h2 id="services-title">{c.services[1]}</h2></div><p>{c.services[2]}</p></div><div className="public-services__grid">{c.serviceItems.map((s,i)=><article key={i} data-reveal="up" style={{'--reveal-order':i}}><div className="public-services__number">{String(i+1).padStart(2,'0')}</div><h3>{s[0]}</h3><p>{s[1]}</p><span>{s[2]}</span><i aria-hidden="true">↗</i></article>)}</div></div></section>; }
function Process({ c }) { return <section className="public-section public-process" id="process" aria-labelledby="process-title"><div className="public-container"><div className="public-process__heading" data-reveal="up"><div><p className="public-eyebrow">{c.process[0]}</p><h2 id="process-title">{c.process[1]}</h2></div><p>{c.process[2]}</p></div><ol className="public-process__steps">{c.steps.map((s,i)=><li key={i} data-reveal="up" style={{'--reveal-order':i}}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{s[0]}</h3><p>{s[1]}</p></div><i aria-hidden="true">↗</i></li>)}</ol></div></section>; }
function DynamicSection({ collection, c, id, type }) { const isNews=type==='news'; const x=isNews?c.news:c.careers; return <section className={`public-section public-listing public-listing--${type}`} id={id} aria-labelledby={`${id}-title`}><div className="public-container"><div className="public-listing__heading" data-reveal="up"><div><p className="public-eyebrow">{x[0]}</p><h2 id={`${id}-title`}>{x[1]}</h2></div><div className="public-listing__intro"><span aria-hidden="true">{isNews?'↳':'＋'}</span><p>{x[2]}</p></div></div>{!isNews&&<div className="public-career-promise" data-reveal="up"><strong>{c.careerPromise[0]}</strong><div>{c.careerPromise.slice(1).map((p)=><span key={p}>{p}</span>)}</div></div>}<div className="public-listing__content" data-reveal="up">{collection.status==='loading'&&<CardSkeletons/>}{collection.status==='error'&&<ContentError message={c.loadError} onRetry={collection.retry}/>} {collection.status==='ready'&&<ContentCards type={type} label={x[3]} items={collection.data} emptyMessage={x[4]}/>}</div></div></section>; }

export default function HomePage({ loadJobs, loadPosts }) {
  const language = usePublicLanguage();
  const c = COPY[language] || COPY.vi;
  const posts = usePublicCollection(loadPosts);
  const jobs = usePublicCollection(loadJobs);
  useDocumentTitle(c.title);
  useHashScroll();
  useScrollReveal([language, posts.status, jobs.status, posts.data.length, jobs.data.length]);
  return <PublicLayout><HeroSection c={c}/><AboutSection c={c}/><Highlights c={c}/><Journey c={c}/><Services c={c}/><Process c={c}/><DynamicSection collection={posts} c={c} id="news" type="news"/><DynamicSection collection={jobs} c={c} id="careers" type="jobs"/></PublicLayout>;
}
