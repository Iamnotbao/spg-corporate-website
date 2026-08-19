import { Link, useParams } from 'react-router-dom';
import ApplicationForm from '../components/ApplicationForm.jsx';
import ContentAttachment from '../components/ContentAttachment.jsx';
import { ContentError, DetailLoading } from '../components/ContentState.jsx';
import DetailCarousel from '../components/DetailCarousel.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import RelatedContent from '../components/RelatedContent.jsx';
import StructuredContent from '../components/StructuredContent.jsx';
import TextContent from '../components/TextContent.jsx';
import { localizeContent, usePublicMessages } from '../i18n.js';
import { useDocumentTitle, usePageTop, usePublicDetail } from '../hooks/usePublicContent.js';
import { getContentImages } from '../utils/content.js';

const copy = {
  vi: { loading: 'Đang tải vị trí tuyển dụng…', error: 'Không tìm thấy hoặc chưa thể tải vị trí tuyển dụng này.', home: 'Trang chủ', careers: 'Tuyển dụng', eyebrow: 'Cơ hội nghề nghiệp', back: 'Xem các vị trí khác', location: 'Địa điểm', type: 'Hình thức', salary: 'Mức lương', hours: 'Thời gian', description: 'Mô tả công việc', benefits: 'Quyền lợi', position: 'Vị trí', benefitsEyebrow: 'Đồng hành cùng SPG', attachment: 'Tài liệu tuyển dụng', apply: 'Ứng tuyển', send: 'Gửi hồ sơ', applyCopy: 'Để lại thông tin, đội ngũ SPG sẽ liên hệ khi hồ sơ phù hợp.' },
  en: { loading: 'Loading position…', error: 'This position could not be found or loaded.', home: 'Home', careers: 'Careers', eyebrow: 'Career opportunity', back: 'View other positions', location: 'Location', type: 'Employment type', salary: 'Salary', hours: 'Working hours', description: 'Job description', benefits: 'Benefits', position: 'Position', benefitsEyebrow: 'Grow with SPG', attachment: 'Recruitment attachment', apply: 'Apply', send: 'Submit application', applyCopy: 'Leave your information and the SPG team will contact you when your profile is suitable.' },
  'zh-tw': { loading: '正在載入職缺…', error: '找不到或無法載入此職缺。', home: '首頁', careers: '人才招募', eyebrow: '職涯機會', back: '查看其他職缺', location: '地點', type: '工作類型', salary: '薪資', hours: '工作時間', description: '職務說明', benefits: '福利', position: '職缺', benefitsEyebrow: '與 SPG 一起成長', attachment: '招募附件', apply: '應徵', send: '投遞履歷', applyCopy: '留下您的資料，若條件合適，SPG 團隊將與您聯絡。' },
};

function JobFact({ label, value }) {
  if (!value) return null;
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

export default function CareerDetailPage({ loadJob, loadJobs, submitApplication }) {
  const { id } = useParams();
  const { language, t } = usePublicMessages();
  const text = copy[language] || copy.vi;
  const { data: job, status, retry } = usePublicDetail(loadJob, id);
  const localized = localizeContent(job, language);

  usePageTop();
  useDocumentTitle(localized?.title ? `${localized.title} | SPG Careers` : `${t('careers')} | SPG Logistics`);

  return (
    <PublicLayout>
      <article className="public-detail public-detail--career">
        {status === 'loading' && <DetailLoading label={text.loading} />}
        {status === 'error' && (
          <div className="public-container public-detail__state-wrap">
            <ContentError message={text.error} onRetry={retry} />
            <Link className="public-link-arrow" to="/#careers"><span aria-hidden="true">←</span>{text.back}</Link>
          </div>
        )}

        {status === 'ready' && job && (
          <>
            <header className="public-detail__hero public-detail__hero--career">
              <div className="public-container public-detail__hero-inner">
                <nav className="public-breadcrumb" aria-label={text.careers}><Link to="/">{text.home}</Link><span aria-hidden="true">/</span><Link to="/#careers">{text.careers}</Link></nav>
                <p className="public-eyebrow public-eyebrow--light">{text.eyebrow}</p>
                <h1>{localized.title || t('jobFallback')}</h1>
                <div className="public-detail__tags"><span>{localized.location || (language === 'vi' ? 'Việt Nam' : 'Vietnam')}</span><span>{localized.type || job.type || 'Full-time'}</span></div>
              </div>
            </header>

            <div className="public-container public-career-layout">
              <div className="public-career-content">
                <DetailCarousel alt={localized.title} images={getContentImages(job)} />
                <div className="public-job-facts">
                  <JobFact label={text.location} value={localized.location || (language === 'vi' ? 'Việt Nam' : 'Vietnam')} />
                  <JobFact label={text.type} value={localized.type || job.type || 'Full-time'} />
                  <JobFact label={text.salary} value={localized.salary} />
                  <JobFact label={text.hours} value={localized.workingHours} />
                </div>

                <section className="public-job-section" aria-labelledby="job-description-title">
                  <p className="public-eyebrow">{text.position}</p><h2 id="job-description-title">{text.description}</h2>
                  <StructuredContent blocks={language === 'vi' ? job.contentBlocks : []} fallbackText={localized.description || localized.summary || (language === 'vi' ? job.description : '')} />
                </section>

                {localized.benefits && (
                  <section className="public-job-section" aria-labelledby="job-benefits-title">
                    <p className="public-eyebrow">{text.benefitsEyebrow}</p><h2 id="job-benefits-title">{text.benefits}</h2><TextContent text={localized.benefits} />
                  </section>
                )}

                <ContentAttachment item={job} label={text.attachment} />
                {loadJobs && <RelatedContent current={job} loadItems={loadJobs} type="jobs" />}
                <Link className="public-link-arrow" to="/#careers"><span aria-hidden="true">←</span>{text.back}</Link>
              </div>

              <aside className="public-application-card" aria-labelledby="application-title">
                <div className="public-application-card__heading">
                  <span aria-hidden="true">↗</span><p className="public-eyebrow public-eyebrow--light">{text.apply}</p><h2 id="application-title">{text.send}</h2><p>{text.applyCopy}</p>
                </div>
                <ApplicationForm jobId={id} position={localized.title || t('jobFallback')} submitApplication={submitApplication} />
              </aside>
            </div>
          </>
        )}
      </article>
    </PublicLayout>
  );
}
