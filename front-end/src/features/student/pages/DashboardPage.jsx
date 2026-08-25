import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LearningProgress from '../../../components/ui/LearningProgress.jsx';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import { getStudentDashboard } from '../services/dashboardService.js';
import '../styles/dashboard.css';

const ACTIVITY_LABELS = {
  lesson_completed: 'Hoàn thành bài học',
  quiz_attempt: 'Làm Quiz',
  vocabulary_review: 'Ôn từ vựng',
  character_practice: 'Luyện Hán tự',
};

const PLAN_ICONS = {
  srs_review: '复',
  continue_course: '学',
  quiz_lesson: '答',
  character_practice: '写',
};

const RATING_LABELS = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

function formatDateTime(value) {
  if (!value) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function weekday(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function Metric({ label, value, note }) {
  return (
    <article className="learning-dashboard-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

function StudyPlan({ items }) {
  return (
    <section className="learning-dashboard-panel learning-dashboard-plan">
      <header className="learning-dashboard-section-heading">
        <div>
          <p className="public-eyebrow">Gợi ý theo dữ liệu hiện tại</p>
          <h2>Hôm nay nên học gì?</h2>
        </div>
        <span>Không dùng AI</span>
      </header>
      {items.length ? (
        <div className="learning-dashboard-plan__list">
          {items.map((item) => (
            <Link
              className="learning-dashboard-plan__item"
              key={item.actionType}
              to={item.destination}
            >
              <span className="learning-dashboard-plan__number">{item.priority}</span>
              <span className="learning-dashboard-plan__icon" aria-hidden="true">
                {PLAN_ICONS[item.actionType] || '学'}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <Link className="button button--primary" to="/courses">
              Khám phá khóa học
            </Link>
          }
          description="Khi bạn đăng ký khóa học, lưu từ vựng hoặc bắt đầu luyện tập, kế hoạch theo quy tắc sẽ xuất hiện tại đây."
          icon="今"
          title="Chưa có việc học đang chờ"
        />
      )}
    </section>
  );
}

function ActivityChart({ streak }) {
  const max = Math.max(1, ...streak.recent7.map((item) => item.actions));
  return (
    <section className="learning-dashboard-panel learning-dashboard-activity-chart">
      <header className="learning-dashboard-section-heading">
        <div>
          <p className="public-eyebrow">7 ngày gần nhất</p>
          <h2>Nhịp học tập</h2>
        </div>
        <small>{streak.activeDates30.length} ngày hoạt động trong 30 ngày</small>
      </header>
      <div
        aria-label="Biểu đồ số hành động học tập trong bảy ngày gần nhất"
        className="learning-dashboard-bars"
        role="img"
      >
        {streak.recent7.map((item) => (
          <div className="learning-dashboard-bar" key={item.date}>
            <span>{item.actions}</span>
            <div>
              <i
                className={item.actions ? 'is-active' : ''}
                style={{
                  '--activity-height': `${Math.max(7, (item.actions / max) * 100)}%`,
                }}
              />
            </div>
            <small>{weekday(item.date)}</small>
          </div>
        ))}
      </div>
      <p className="learning-dashboard-footnote">
        Một ngày được tính khi có ít nhất một bài học hoàn thành, lượt làm Quiz, lượt ôn
        SRS được lưu gần nhất hoặc lượt luyện Hán tự.
      </p>
    </section>
  );
}

function CourseSection({ courses }) {
  return (
    <section className="learning-dashboard-section learning-dashboard-courses">
      <header className="learning-dashboard-section-heading">
        <div>
          <p className="public-eyebrow">Lộ trình đang theo học</p>
          <h2>Khóa học của bạn</h2>
        </div>
        <Link to="/my-courses">Quản lý khóa học →</Link>
      </header>
      {courses.length ? (
        <div className="learning-dashboard-course-grid">
          {courses.map((item) => (
            <article className="learning-dashboard-course" key={item.enrollment.id}>
              <div>
                <span>{item.course.level || 'Mandora'}</span>
                <h3>{item.course.title}</h3>
                <p>
                  {item.completedLessons}/{item.totalLessons} bài học đã hoàn thành
                </p>
              </div>
              <LearningProgress value={item.progressPercentage} />
              {item.continueDestination ? (
                <Link className="button button--primary" to={item.continueDestination}>
                  Tiếp tục · {item.continueLesson.title}
                </Link>
              ) : (
                <Link
                  className="button button--secondary"
                  to={`/courses/${item.course.slug}`}
                >
                  Xem khóa học
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <Link className="button button--primary" to="/courses">
              Xem danh sách khóa học
            </Link>
          }
          description="Đăng ký một khóa học đã xuất bản để theo dõi tiến độ thật của bạn."
          icon="课"
          title="Bạn chưa có khóa học đang hoạt động"
        />
      )}
    </section>
  );
}

function SrsSection({ srs }) {
  const stages = [
    ['Mới', srs.stages.new],
    ['Đang học', srs.stages.learning],
    ['Ôn tập', srs.stages.review],
  ];
  const ratings = Object.entries(srs.latestRatingDistribution);
  return (
    <section className="learning-dashboard-panel learning-dashboard-domain">
      <header className="learning-dashboard-section-heading">
        <div>
          <p className="public-eyebrow">Spaced repetition</p>
          <h2>Ôn từ vựng</h2>
        </div>
        <Link to="/review">Mở phiên ôn →</Link>
      </header>
      <div className="learning-dashboard-domain__lead">
        <strong>{srs.dueNow}</strong>
        <span>thẻ đến hạn ngay</span>
        <small>
          {srs.overdue} quá hạn · {srs.reviewedToday} đã ôn hôm nay
        </small>
      </div>
      <div className="learning-dashboard-stage-grid">
        {stages.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="learning-dashboard-rating-grid">
        {ratings.map(([rating, value]) => (
          <div key={rating}>
            <span>{RATING_LABELS[rating]}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="learning-dashboard-footnote">
        Phân bố trên là đánh giá gần nhất đang được lưu cho mỗi thẻ, không phải toàn bộ
        lịch sử đánh giá.
      </p>
    </section>
  );
}

function QuizSection({ quiz }) {
  return (
    <section className="learning-dashboard-panel learning-dashboard-domain">
      <header className="learning-dashboard-section-heading">
        <div>
          <p className="public-eyebrow">Kết quả đã lưu</p>
          <h2>Quiz</h2>
        </div>
        <Link to="/progress">Xem tiến độ →</Link>
      </header>
      <div className="learning-dashboard-score-row">
        <div>
          <span>Gần nhất</span>
          <strong>{quiz.recentScore == null ? '—' : `${quiz.recentScore}%`}</strong>
        </div>
        <div>
          <span>Tốt nhất</span>
          <strong>{quiz.bestScore == null ? '—' : `${quiz.bestScore}%`}</strong>
        </div>
      </div>
      <dl className="learning-dashboard-facts">
        <div>
          <dt>Tổng lượt làm</dt>
          <dd>{quiz.totalAttempts}</dd>
        </div>
        <div>
          <dt>Lượt đạt</dt>
          <dd>{quiz.passedAttempts}</dd>
        </div>
        <div>
          <dt>Quiz gần đây</dt>
          <dd>{quiz.recentlyAttemptedQuiz?.title || 'Chưa có'}</dd>
        </div>
      </dl>
    </section>
  );
}

function CharacterSection({ character }) {
  return (
    <section className="learning-dashboard-panel learning-dashboard-domain">
      <header className="learning-dashboard-section-heading">
        <div>
          <p className="public-eyebrow">Luyện viết bằng nét</p>
          <h2>Hán tự</h2>
        </div>
        <Link to="/characters">Chọn chữ luyện →</Link>
      </header>
      <div className="learning-dashboard-score-row">
        <div>
          <span>Gần nhất</span>
          <strong>{character.recentScore == null ? '—' : character.recentScore}</strong>
        </div>
        <div>
          <span>Tốt nhất</span>
          <strong>{character.bestScore == null ? '—' : character.bestScore}</strong>
        </div>
      </div>
      <dl className="learning-dashboard-facts">
        <div>
          <dt>Tổng lượt luyện</dt>
          <dd>{character.totalAttempts}</dd>
        </div>
        <div>
          <dt>Số chữ đã luyện</dt>
          <dd>{character.charactersPracticed}</dd>
        </div>
        <div>
          <dt>Lần gần nhất</dt>
          <dd>{formatDateTime(character.recentPracticeAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

function RecentActivity({ items }) {
  return (
    <section className="learning-dashboard-section learning-dashboard-recent">
      <header className="learning-dashboard-section-heading">
        <div>
          <p className="public-eyebrow">Dấu chân học tập</p>
          <h2>Hoạt động gần đây</h2>
        </div>
      </header>
      {items.length ? (
        <div className="learning-dashboard-timeline">
          {items.map((item) => {
            const content = (
              <>
                <i aria-hidden="true" />
                <span>
                  <small>{ACTIVITY_LABELS[item.type] || 'Học tập'}</small>
                  <strong>{item.title}</strong>
                  <em>{item.detail}</em>
                </span>
                <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
              </>
            );
            return item.destination ? (
              <Link key={item.id} to={item.destination}>
                {content}
              </Link>
            ) : (
              <article key={item.id}>{content}</article>
            );
          })}
        </div>
      ) : (
        <p className="learning-dashboard-empty-line">
          Hoàn thành một bài học, làm Quiz, ôn từ vựng hoặc luyện Hán tự để bắt đầu lịch
          sử học tập.
        </p>
      )}
    </section>
  );
}

export default function DashboardPage() {
  usePageTitle('Bảng học tập');
  const auth = useStudentAuth();
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const load = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    getStudentDashboard()
      .then((response) => setState({ status: 'ready', data: response.data, error: '' }))
      .catch((error) => setState({ status: 'error', data: null, error: error.message }));
  }, []);
  useEffect(load, [load]);

  const firstName = useMemo(() => {
    const name = auth.user?.displayName || auth.user?.username || 'bạn';
    return name.trim().split(/\s+/).at(-1);
  }, [auth.user]);

  if (state.status === 'loading') {
    return (
      <section className="learning-dashboard-page">
        <div className="public-container">
          <LoadingState count={6} label="Đang tổng hợp dữ liệu học tập" />
        </div>
      </section>
    );
  }
  if (state.status === 'error') {
    return (
      <section className="learning-dashboard-page">
        <div className="public-container">
          <ErrorState message={state.error} onRetry={load} />
        </div>
      </section>
    );
  }

  const data = state.data;
  return (
    <div className="learning-dashboard-page">
      <section className="learning-dashboard-hero">
        <div className="public-container learning-dashboard-hero__inner">
          <div>
            <p className="public-eyebrow">Không gian học viên</p>
            <h1>Chào {firstName}, mình học tiếp nhé.</h1>
            <p>
              Mọi con số dưới đây được tính từ hoạt động học tập đã lưu của chính bạn.
            </p>
            {data.todayPlan[0] && (
              <Link className="button button--primary" to={data.todayPlan[0].destination}>
                Bắt đầu · {data.todayPlan[0].title}
              </Link>
            )}
          </div>
          <article className="learning-dashboard-streak">
            <span aria-hidden="true">火</span>
            <div>
              <small>Chuỗi hiện tại</small>
              <strong>{data.streak.currentStreak}</strong>
              <b>ngày</b>
            </div>
            <p>Kỷ lục dài nhất: {data.streak.longestStreak} ngày</p>
          </article>
        </div>
      </section>

      <div className="public-container learning-dashboard-content">
        <div className="learning-dashboard-metrics">
          <Metric label="Khóa đang học" value={data.overview.activeCourses} />
          <Metric
            label="Bài đã hoàn thành"
            note={`trên ${data.overview.totalPublishedLessons} bài đã xuất bản`}
            value={data.overview.completedLessons}
          />
          <Metric
            label="Từ vựng đã lưu"
            note={`${data.overview.dueVocabulary} đang đến hạn`}
            value={data.overview.savedVocabulary}
          />
          <Metric
            label="Đã ôn hôm nay"
            note="thẻ SRS"
            value={data.overview.reviewedVocabularyToday}
          />
        </div>

        <div className="learning-dashboard-top-grid">
          <StudyPlan items={data.todayPlan} />
          <ActivityChart streak={data.streak} />
        </div>

        <CourseSection courses={data.courses} />

        <div className="learning-dashboard-domain-grid">
          <SrsSection srs={data.srs} />
          <QuizSection quiz={data.quiz} />
          <CharacterSection character={data.character} />
        </div>

        <RecentActivity items={data.recentActivity} />
      </div>
    </div>
  );
}
