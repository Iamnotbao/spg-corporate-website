import { CardSkeletons, ContentError } from '../components/ContentState.jsx';
import ContentCards from '../components/ContentCards.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import {
  useDocumentTitle,
  useHashScroll,
  usePublicCollection,
} from '../hooks/usePublicContent.js';
import useScrollReveal from '../hooks/useScrollReveal.js';

const services = [
  {
    number: '01',
    title: 'Vận tải & giao nhận',
    copy: 'Điều phối linh hoạt cho từng lô hàng, từ điểm xuất phát đến nơi giao nhận cuối cùng.',
    note: 'Kết nối đa phương thức',
  },
  {
    number: '02',
    title: 'Kho bãi & phân phối',
    copy: 'Tổ chức lưu kho và luân chuyển hàng hóa rõ ràng, phù hợp với nhịp độ vận hành thực tế.',
    note: 'Tối ưu dòng hàng',
  },
  {
    number: '03',
    title: 'Tư vấn chuỗi cung ứng',
    copy: 'Đồng hành rà soát quy trình, nhận diện điểm nghẽn và xây dựng phương án vận hành phù hợp.',
    note: 'Giải pháp theo nhu cầu',
  },
];

const principles = [
  {
    number: '01',
    title: 'Đáng tin cậy',
    copy: 'Cam kết rõ ràng, phối hợp nhất quán và theo sát hành trình.',
  },
  {
    number: '02',
    title: 'Linh hoạt',
    copy: 'Chủ động thích ứng với yêu cầu riêng và thay đổi trong vận hành.',
  },
  {
    number: '03',
    title: 'Đồng hành',
    copy: 'Lấy mục tiêu dài hạn của khách hàng làm trọng tâm cho mọi giải pháp.',
  },
];

// Thay `period` bằng năm thực tế khi lịch sử doanh nghiệp đã được xác nhận.
const companyMilestones = [
  {
    marker: '01',
    period: 'Giai đoạn khởi đầu',
    title: 'Hình thành từ một nhu cầu rất thực tế.',
    copy: 'SPG đặt nền móng từ mong muốn giúp doanh nghiệp vận chuyển hàng hóa rõ ràng hơn, chủ động hơn và an tâm hơn.',
  },
  {
    marker: '02',
    period: 'Giai đoạn phát triển',
    title: 'Mở rộng năng lực theo từng hành trình.',
    copy: 'Từ giao nhận, hoạt động dần được kết nối với kho bãi, phân phối và tư vấn để đáp ứng nhiều bài toán vận hành hơn.',
  },
  {
    marker: '03',
    period: 'Giai đoạn hoàn thiện',
    title: 'Chuẩn hóa cách phối hợp.',
    copy: 'Quy trình được tổ chức quanh một đầu mối xuyên suốt, thông tin minh bạch và phản hồi kịp thời giữa các bên.',
  },
  {
    marker: '04',
    period: 'Chặng đường tiếp theo',
    title: 'Tiếp tục tiến về phía trước.',
    copy: 'SPG theo đuổi tinh thần cải tiến liên tục, sẵn sàng thích ứng cùng nhu cầu mới của khách hàng và thị trường.',
  },
];

// Các giá trị dưới đây mô tả cấu trúc dịch vụ hiện có, không phải số liệu kinh doanh.
const operatingHighlights = [
  {
    value: '01',
    unit: 'đầu mối',
    title: 'Phối hợp xuyên suốt',
    copy: 'Thông tin được kết nối rõ ràng trong toàn bộ hành trình.',
  },
  {
    value: String(services.length).padStart(2, '0'),
    unit: 'nhóm giải pháp',
    title: 'Năng lực trọng tâm',
    copy: 'Vận tải, kho vận và tư vấn cùng hỗ trợ một mục tiêu chung.',
  },
  {
    value: '04',
    unit: 'bước vận hành',
    title: 'Quy trình dễ theo dõi',
    copy: 'Từ tiếp nhận đến cải tiến đều có định hướng cụ thể.',
  },
  {
    value: '∞',
    unit: 'tinh thần',
    title: 'Không ngừng cải tiến',
    copy: 'Mỗi phản hồi là một cơ hội để hành trình tiếp theo tốt hơn.',
  },
];

const processSteps = [
  [
    '01',
    'Tiếp nhận',
    'Lắng nghe mục tiêu, đặc thù hàng hóa và yêu cầu vận hành của doanh nghiệp.',
  ],
  [
    '02',
    'Thiết kế',
    'Xây dựng phương án phù hợp về tuyến đường, thời gian và nguồn lực.',
  ],
  ['03', 'Triển khai', 'Điều phối từng chặng với một đầu mối hỗ trợ xuyên suốt.'],
  [
    '04',
    'Cải tiến',
    'Theo dõi kết quả, phản hồi nhanh và liên tục tối ưu cách vận hành.',
  ],
];

function HeroSection() {
  return (
    <section className="public-hero" aria-labelledby="public-hero-title">
      <div className="public-container public-hero__grid">
        <div className="public-hero__content" data-reveal="left">
          <p className="public-eyebrow">SPG Logistics · Vietnam</p>
          <h1 id="public-hero-title">
            Kết nối hàng hóa.
            <span>Mở rộng tương lai.</span>
          </h1>
          <p className="public-hero__lead">
            Chúng tôi kiến tạo giải pháp logistics linh hoạt, hiệu quả và minh bạch để
            doanh nghiệp an tâm trên từng chặng đường.
          </p>
          <div className="public-hero__actions">
            <a className="public-button" href="/#services">
              Khám phá dịch vụ
              <span aria-hidden="true">↗</span>
            </a>
            <a className="public-link-arrow" href="/#journey">
              Câu chuyện SPG
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="public-network" aria-hidden="true" data-reveal="right">
          <div className="public-network__grid" />
          <span className="public-network__route public-network__route--one" />
          <span className="public-network__route public-network__route--two" />
          <span className="public-network__node public-network__node--one" />
          <span className="public-network__node public-network__node--two" />
          <span className="public-network__node public-network__node--three" />
          <div className="public-network__label public-network__label--origin">
            <small>Điểm đi</small>
            <strong>Ho Chi Minh City</strong>
          </div>
          <div className="public-network__label public-network__label--destination">
            <small>Điểm đến</small>
            <strong>Đúng nơi · Đúng lúc</strong>
          </div>
          <div className="public-network__status">
            <span />
            Hành trình đang được kết nối
          </div>
          <div className="public-network__card">
            <small>SPG CONTROL</small>
            <strong>Một hành trình liền mạch</strong>
            <div>
              <span>Tiếp nhận</span>
              <i />
              <span>Điều phối</span>
              <i />
              <span>Hoàn tất</span>
            </div>
          </div>
        </div>
      </div>

      <div className="public-container public-hero__trust-line" data-reveal="up">
        <span>Vận hành có trách nhiệm</span>
        <span>Một đầu mối xuyên suốt</span>
        <span>Phản hồi nhanh chóng</span>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section
      className="public-section public-about"
      id="about"
      aria-labelledby="about-title"
    >
      <div className="public-container public-about__grid">
        <div data-reveal="left">
          <p className="public-eyebrow">01 · Về chúng tôi</p>
          <h2 id="about-title">Logistics được xây dựng trên sự tin cậy.</h2>
        </div>
        <div className="public-about__copy" data-reveal="right">
          <p className="public-section-lead">
            SPG đồng hành cùng doanh nghiệp bằng tư duy thực tế, khả năng thích ứng và cam
            kết rõ ràng trong từng khâu vận hành.
          </p>
          <p>
            Chúng tôi hiểu rằng mỗi lô hàng đều gắn với một kế hoạch kinh doanh. Vì vậy,
            đội ngũ SPG tập trung vào giao tiếp minh bạch, phối hợp chủ động và giải pháp
            vừa vặn với nhu cầu thực tế.
          </p>
          <a className="public-link-arrow" href="/#contact">
            Trao đổi cùng chúng tôi
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="public-container public-about__statement" data-reveal="up">
        <div className="public-about__statement-mark" aria-hidden="true">
          “
        </div>
        <p>
          Chúng tôi không chỉ di chuyển hàng hóa — chúng tôi giữ cho kế hoạch của khách
          hàng luôn tiếp tục chuyển động.
        </p>
        <span>Quan điểm vận hành tại SPG</span>
      </div>

      <div className="public-container public-about__principles">
        {principles.map((principle, index) => (
          <article
            key={principle.number}
            data-reveal="up"
            style={{ '--reveal-order': index }}
          >
            <span>{principle.number}</span>
            <h3>{principle.title}</h3>
            <p>{principle.copy}</p>
            <i aria-hidden="true">↗</i>
          </article>
        ))}
      </div>
    </section>
  );
}

function OperatingHighlightsSection() {
  return (
    <section className="public-proof" aria-labelledby="operating-highlights-title">
      <div className="public-container">
        <div className="public-proof__heading" data-reveal="up">
          <p className="public-eyebrow public-eyebrow--light">02 · Dấu ấn vận hành</p>
          <h2 id="operating-highlights-title">
            Một cấu trúc gọn.
            <span>Một cam kết dài hạn.</span>
          </h2>
          <p>
            Những con số dưới đây phản ánh cách SPG đang tổ chức dịch vụ và phối hợp công
            việc — rõ ràng, tập trung và luôn có thể cải tiến.
          </p>
        </div>

        <dl className="public-proof__grid">
          {operatingHighlights.map((item, index) => (
            <div key={item.title} data-reveal="up" style={{ '--reveal-order': index }}>
              <dt>
                <strong>{item.value}</strong>
                <span>{item.unit}</span>
              </dt>
              <dd>
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function JourneySection() {
  return (
    <section
      className="public-section public-journey"
      id="journey"
      aria-labelledby="journey-title"
    >
      <div className="public-container">
        <div className="public-journey__heading" data-reveal="up">
          <p className="public-eyebrow">03 · Hành trình phát triển</p>
          <h2 id="journey-title">Từng bước trưởng thành cùng nhu cầu doanh nghiệp.</h2>
          <p>
            Mỗi giai đoạn là một bước hoàn thiện năng lực, nhưng tinh thần đồng hành vẫn
            luôn là điểm bắt đầu của mọi quyết định.
          </p>
        </div>

        <ol className="public-timeline" aria-label="Các giai đoạn phát triển của SPG">
          {companyMilestones.map((milestone, index) => (
            <li key={milestone.marker}>
              <article
                className="public-timeline__card"
                data-reveal={index % 2 === 0 ? 'left' : 'right'}
              >
                <p>{milestone.period}</p>
                <h3>{milestone.title}</h3>
                <span>{milestone.copy}</span>
              </article>
              <div className="public-timeline__marker" aria-hidden="true">
                <span>{milestone.marker}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section
      className="public-section public-services"
      id="services"
      aria-labelledby="services-title"
    >
      <div className="public-container">
        <div className="public-section-heading" data-reveal="up">
          <div>
            <p className="public-eyebrow public-eyebrow--light">04 · Dịch vụ</p>
            <h2 id="services-title">Giải pháp cho từng chặng vận hành.</h2>
          </div>
          <p>
            Từ nhu cầu đơn lẻ đến chuỗi vận hành nhiều điểm, SPG thiết kế phương án hướng
            tới hiệu quả và khả năng kiểm soát.
          </p>
        </div>

        <div className="public-services__grid">
          {services.map((service, index) => (
            <article
              key={service.number}
              data-reveal="up"
              style={{ '--reveal-order': index }}
            >
              <div className="public-services__number">{service.number}</div>
              <h3>{service.title}</h3>
              <p>{service.copy}</p>
              <span>{service.note}</span>
              <i aria-hidden="true">↗</i>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section
      className="public-section public-process"
      id="process"
      aria-labelledby="process-title"
    >
      <div className="public-container">
        <div className="public-process__heading" data-reveal="up">
          <div>
            <p className="public-eyebrow">05 · Quy trình</p>
            <h2 id="process-title">Rõ ràng từ bước đầu tiên.</h2>
          </div>
          <p>
            Một quy trình gọn, dễ theo dõi giúp đội ngũ hai bên phối hợp nhanh và đưa ra
            quyết định đúng lúc.
          </p>
        </div>

        <ol className="public-process__steps">
          {processSteps.map(([number, title, copy], index) => (
            <li key={number} data-reveal="up" style={{ '--reveal-order': index }}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
              <i aria-hidden="true">↗</i>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function DynamicSection({ collection, eyebrow, id, title, type }) {
  const isNews = type === 'news';

  return (
    <section
      className={`public-section public-listing public-listing--${type}`}
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <div className="public-container">
        <div className="public-listing__heading" data-reveal="up">
          <div>
            <p className="public-eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`}>{title}</h2>
          </div>
          <div className="public-listing__intro">
            <span aria-hidden="true">{isNews ? '↳' : '＋'}</span>
            <p>
              {isNews
                ? 'Câu chuyện, góc nhìn và những cập nhật mới từ đội ngũ SPG.'
                : 'Tìm nơi bạn có thể học hỏi, đóng góp và cùng chúng tôi tạo nên những hành trình tốt hơn.'}
            </p>
          </div>
        </div>

        {!isNews && (
          <div className="public-career-promise" data-reveal="up">
            <strong>Nơi mỗi đóng góp đều tạo ra chuyển động.</strong>
            <div>
              <span>Học hỏi trong công việc</span>
              <span>Phối hợp cởi mở</span>
              <span>Cùng nhau phát triển</span>
            </div>
          </div>
        )}

        <div className="public-listing__content" data-reveal="up">
          {collection.status === 'loading' && <CardSkeletons />}
          {collection.status === 'error' && (
            <ContentError
              message="Chưa thể tải dữ liệu. Vui lòng thử lại."
              onRetry={collection.retry}
            />
          )}
          {collection.status === 'ready' && (
            <ContentCards
              type={type}
              label={isNews ? 'tin tức' : 'vị trí tuyển dụng'}
              items={collection.data}
              emptyMessage={
                isNews
                  ? 'Nội dung mới đang được chuẩn bị. Vui lòng quay lại sau.'
                  : 'Hiện chưa có vị trí tuyển dụng đang mở.'
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default function HomePage({ loadJobs, loadPosts }) {
  const posts = usePublicCollection(loadPosts);
  const jobs = usePublicCollection(loadJobs);

  useDocumentTitle('SPG Logistics | Kết nối hàng hóa, mở rộng tương lai');
  useHashScroll();
  useScrollReveal([posts.status, jobs.status, posts.data.length, jobs.data.length]);

  return (
    <PublicLayout>
      <HeroSection />
      <AboutSection />
      <OperatingHighlightsSection />
      <JourneySection />
      <ServicesSection />
      <ProcessSection />
      <DynamicSection
        collection={posts}
        eyebrow="06 · Tin tức"
        id="news"
        title="Cập nhật từ SPG."
        type="news"
      />
      <DynamicSection
        collection={jobs}
        eyebrow="07 · Cơ hội nghề nghiệp"
        id="careers"
        title="Cùng nhau tiến về phía trước."
        type="jobs"
      />
    </PublicLayout>
  );
}
