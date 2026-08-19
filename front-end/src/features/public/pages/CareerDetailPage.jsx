import { Link, useParams } from 'react-router-dom';
import ApplicationForm from '../components/ApplicationForm.jsx';
import ContentAttachment from '../components/ContentAttachment.jsx';
import { ContentError, DetailLoading } from '../components/ContentState.jsx';
import DetailCarousel from '../components/DetailCarousel.jsx';
import PublicLayout from '../components/PublicLayout.jsx';
import RelatedContent from '../components/RelatedContent.jsx';
import TextContent from '../components/TextContent.jsx';
import {
  useDocumentTitle,
  usePageTop,
  usePublicDetail,
} from '../hooks/usePublicContent.js';
import { getContentImages } from '../utils/content.js';

function JobFact({ label, value }) {
  if (!value) return null;

  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function CareerDetailPage({ loadJob, loadJobs, submitApplication }) {
  const { id } = useParams();
  const { data: job, status, retry } = usePublicDetail(loadJob, id);

  usePageTop();
  useDocumentTitle(
    job?.title ? `${job.title} | SPG Careers` : 'Tuyển dụng | SPG Logistics',
  );

  return (
    <PublicLayout>
      <article className="public-detail public-detail--career">
        {status === 'loading' && <DetailLoading label="Đang tải vị trí tuyển dụng…" />}

        {status === 'error' && (
          <div className="public-container public-detail__state-wrap">
            <ContentError
              message="Không tìm thấy hoặc chưa thể tải vị trí tuyển dụng này."
              onRetry={retry}
            />
            <Link className="public-link-arrow" to="/#careers">
              <span aria-hidden="true">←</span>
              Quay lại tuyển dụng
            </Link>
          </div>
        )}

        {status === 'ready' && job && (
          <>
            <header className="public-detail__hero public-detail__hero--career">
              <div className="public-container public-detail__hero-inner">
                <nav className="public-breadcrumb" aria-label="Đường dẫn">
                  <Link to="/">Trang chủ</Link>
                  <span aria-hidden="true">/</span>
                  <Link to="/#careers">Tuyển dụng</Link>
                </nav>
                <p className="public-eyebrow public-eyebrow--light">Cơ hội nghề nghiệp</p>
                <h1>{job.title || 'Cơ hội nghề nghiệp tại SPG'}</h1>
                <div className="public-detail__tags">
                  <span>{job.location || 'Việt Nam'}</span>
                  <span>{job.type || 'Full-time'}</span>
                </div>
              </div>
            </header>

            <div className="public-container public-career-layout">
              <div className="public-career-content">
                <DetailCarousel alt={job.title} images={getContentImages(job)} />

                <div className="public-job-facts">
                  <JobFact label="Địa điểm" value={job.location || 'Việt Nam'} />
                  <JobFact label="Hình thức" value={job.type || 'Full-time'} />
                  <JobFact label="Mức lương" value={job.salary} />
                  <JobFact label="Thời gian" value={job.workingHours} />
                </div>

                <section
                  className="public-job-section"
                  aria-labelledby="job-description-title"
                >
                  <p className="public-eyebrow">Vị trí</p>
                  <h2 id="job-description-title">Mô tả công việc</h2>
                  <TextContent text={job.description || job.summary} />
                </section>

                {job.benefits && (
                  <section
                    className="public-job-section"
                    aria-labelledby="job-benefits-title"
                  >
                    <p className="public-eyebrow">Đồng hành cùng SPG</p>
                    <h2 id="job-benefits-title">Quyền lợi</h2>
                    <TextContent text={job.benefits} />
                  </section>
                )}

                <ContentAttachment item={job} label="Tài liệu tuyển dụng" />
                {loadJobs && <RelatedContent current={job} loadItems={loadJobs} type="jobs" />}

                <Link className="public-link-arrow" to="/#careers">
                  <span aria-hidden="true">←</span>
                  Xem các vị trí khác
                </Link>
              </div>

              <aside
                className="public-application-card"
                aria-labelledby="application-title"
              >
                <div className="public-application-card__heading">
                  <span aria-hidden="true">↗</span>
                  <p className="public-eyebrow public-eyebrow--light">Ứng tuyển</p>
                  <h2 id="application-title">Gửi hồ sơ</h2>
                  <p>Để lại thông tin, đội ngũ SPG sẽ liên hệ khi hồ sơ phù hợp.</p>
                </div>
                <ApplicationForm
                  jobId={id}
                  position={job.title || 'Vị trí tuyển dụng tại SPG'}
                  submitApplication={submitApplication}
                />
              </aside>
            </div>
          </>
        )}
      </article>
    </PublicLayout>
  );
}
