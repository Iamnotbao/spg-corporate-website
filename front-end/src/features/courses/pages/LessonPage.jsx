import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import LearningProgress from '../../../components/ui/LearningProgress.jsx';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import PublicToast from '../../../components/ui/PublicToast.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import VocabularyCard from '../../learning/components/VocabularyCard.jsx';
import {
  listPublicVocabulary,
  listSavedVocabulary,
  saveVocabulary,
  unsaveVocabulary,
} from '../../learning/services/vocabularyService.js';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import { usePublicDetail } from '../../public/hooks/usePublicContent.js';
import {
  completeLesson,
  getStudentCourseState,
} from '../../student/services/studentLearningService.js';
import CourseOutline from '../components/CourseOutline.jsx';
import LessonNavigation from '../components/LessonNavigation.jsx';
import { getPublicCourse, getPublicLesson } from '../services/courseCatalogService.js';
import '../styles/courses.css';

const TYPE_LABELS = {
  character: 'Hán tự',
  grammar: 'Ngữ pháp',
  listening: 'Luyện nghe',
  practice: 'Luyện tập',
  quiz: 'Quiz',
  reading: 'Đọc hiểu',
  vocabulary: 'Từ vựng',
};

export default function LessonPage() {
  const { courseSlug, lessonSlug } = useParams();
  const location = useLocation();
  const auth = useStudentAuth();
  const course = usePublicDetail(
    useCallback((slug) => getPublicCourse(slug), []),
    courseSlug,
  );
  const lesson = usePublicDetail(
    useCallback((slug) => getPublicLesson(slug), []),
    lessonSlug,
  );
  const [studentState, setStudentState] = useState(null);
  const [completionError, setCompletionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lessonVocabulary, setLessonVocabulary] = useState([]);
  const [vocabularyStatus, setVocabularyStatus] = useState('idle');
  const [savedIds, setSavedIds] = useState(new Set());
  const [busyVocabularyId, setBusyVocabularyId] = useState('');
  const [notice, setNotice] = useState({ message: '', variant: 'success' });

  const lessons = useMemo(
    () =>
      (course.data?.units || []).flatMap((unit) =>
        unit.lessons.map((item) => ({ ...item, unitTitle: unit.title })),
      ),
    [course.data],
  );
  const lessonIndex = lessons.findIndex((item) => item.slug === lessonSlug);
  const isComplete = studentState?.completedLessonIds?.includes(lesson.data?.id);
  usePageTitle(lesson.data?.title || 'Bài học');

  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setStudentState(null);
      return;
    }
    getStudentCourseState(courseSlug)
      .then((result) => setStudentState(result.data))
      .catch((error) => setCompletionError(error.message));
  }, [auth.status, courseSlug]);

  useEffect(() => {
    if (lesson.data?.type !== 'vocabulary' || !lesson.data?.id) {
      setLessonVocabulary([]);
      setVocabularyStatus('idle');
      return;
    }
    setVocabularyStatus('loading');
    listPublicVocabulary({ lessonId: lesson.data.id })
      .then((result) => {
        setLessonVocabulary(result.data || []);
        setVocabularyStatus('ready');
      })
      .catch(() => {
        setLessonVocabulary([]);
        setVocabularyStatus('error');
      });
  }, [lesson.data?.id, lesson.data?.type]);

  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setSavedIds(new Set());
      return;
    }
    listSavedVocabulary()
      .then((result) => setSavedIds(new Set((result.data || []).map((item) => item.id))))
      .catch(() => setSavedIds(new Set()));
  }, [auth.status]);

  async function markComplete() {
    setSubmitting(true);
    setCompletionError('');
    try {
      const result = await completeLesson(lessonSlug);
      setStudentState(result.data.courseState);
      setNotice({ message: 'Đã lưu tiến độ bài học.', variant: 'success' });
    } catch (error) {
      setCompletionError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSaveVocabulary(item) {
    if (auth.status !== 'signed-in') return;
    setBusyVocabularyId(item.id);
    try {
      const wasSaved = savedIds.has(item.id);
      if (wasSaved) await unsaveVocabulary(item.id);
      else await saveVocabulary(item.id);
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      setNotice({
        message: wasSaved ? `Đã bỏ lưu “${item.simplified}”.` : `Đã lưu “${item.simplified}” để ôn lại.`,
        variant: 'success',
      });
    } catch (error) {
      setNotice({ message: error.message || 'Không thể cập nhật từ đã lưu.', variant: 'error' });
    } finally {
      setBusyVocabularyId('');
    }
  }

  if (course.status === 'loading' || lesson.status === 'loading')
    return (
      <section className="course-detail-loading">
        <LoadingState count={1} label="Đang tải bài học" />
      </section>
    );
  if (
    (course.status === 'error' && course.errorStatus === 404) ||
    (lesson.status === 'error' && lesson.errorStatus === 404)
  )
    return <NotFoundPage />;
  if (course.status === 'error' || lesson.status === 'error')
    return (
      <section className="course-detail-loading">
        <ErrorState
          message={course.error || lesson.error}
          onRetry={course.status === 'error' ? course.retry : lesson.retry}
        />
      </section>
    );
  if (
    !course.data ||
    !lesson.data ||
    lesson.data.course?.slug !== course.data.slug ||
    lessonIndex < 0
  )
    return <NotFoundPage />;

  const isQuizLesson = lesson.data.type === 'quiz';
  const quizUrl = `/courses/${courseSlug}/lessons/${lessonSlug}/quiz`;

  return (
    <section className="lesson-page">
      <div className="public-container lesson-page__grid">
        <aside className="lesson-sidebar">
          <Link className="breadcrumb-link" to={`/courses/${course.data.slug}`}>
            ← {course.data.title}
          </Link>
          <CourseOutline
            compact
            course={course.data}
            currentLessonSlug={lesson.data.slug}
          />
        </aside>
        <article className="lesson-content">
          <header className="lesson-header">
            <div>
              <span>{lesson.data.unit?.title}</span>
              <span>{TYPE_LABELS[lesson.data.type] || lesson.data.type}</span>
            </div>
            <h1>{lesson.data.title}</h1>
            {lesson.data.description && <p>{lesson.data.description}</p>}
          </header>
          <div className="lesson-body lesson-body--plain">
            {lesson.data.content
              .split(/\r?\n/)
              .map((paragraph, index) =>
                paragraph ? (
                  <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
                ) : (
                  <br key={index} />
                ),
              )}
          </div>

          {lesson.data.type === 'vocabulary' && (
            <section className="lesson-vocabulary-section">
              <div className="lesson-vocabulary-section__heading">
                <div>
                  <span>Từ vựng trong bài</span>
                  <h2>Học từ ngay trong Lesson</h2>
                </div>
                <Link to="/vocabulary">Xem toàn bộ từ vựng →</Link>
              </div>
              {vocabularyStatus === 'loading' && <LoadingState count={3} label="Đang tải từ vựng" />}
              {vocabularyStatus === 'error' && (
                <p className="lesson-vocabulary-empty">Không thể tải từ vựng của bài học này.</p>
              )}
              {vocabularyStatus === 'ready' && lessonVocabulary.length === 0 && (
                <p className="lesson-vocabulary-empty">
                  Bài học này chưa có từ vựng được xuất bản.
                </p>
              )}
              {vocabularyStatus === 'ready' && lessonVocabulary.length > 0 && (
                <div className="lesson-vocabulary-grid">
                  {lessonVocabulary.map((item) => (
                    <VocabularyCard
                      busy={busyVocabularyId === item.id}
                      item={item}
                      key={item.id}
                      onToggleSave={toggleSaveVocabulary}
                      saved={savedIds.has(item.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="lesson-completion-foundation">
            <div>
              <span aria-hidden="true">{isComplete ? '✓' : '○'}</span>
              <div>
                <strong>
                  {isComplete
                    ? 'Bài học đã hoàn thành'
                    : isQuizLesson
                      ? 'Hoàn thành bằng Quiz'
                      : 'Hoàn thành bài học'}
                </strong>
                {isQuizLesson && !isComplete && (
                  <p>Đạt điểm yêu cầu của Quiz để hoàn thành bài học này.</p>
                )}
                {studentState?.enrolled && (
                  <LearningProgress value={studentState.progressPercentage} />
                )}
                {completionError && <p role="alert">{completionError}</p>}
              </div>
            </div>
            {auth.status !== 'signed-in' ? (
              <Link
                className="button button--primary"
                state={{ from: isQuizLesson ? quizUrl : location.pathname }}
                to="/login"
              >
                Đăng nhập để lưu tiến độ
              </Link>
            ) : !studentState?.enrolled ? (
              <Link className="button button--primary" to={`/courses/${courseSlug}`}>
                Đăng ký khóa học
              </Link>
            ) : isQuizLesson ? (
              <Link className="button button--primary" to={quizUrl}>
                {isComplete ? 'Làm lại Quiz' : 'Bắt đầu Quiz'}
              </Link>
            ) : (
              <button
                className="button button--primary"
                disabled={isComplete || submitting}
                onClick={markComplete}
                type="button"
              >
                {submitting
                  ? 'Đang lưu…'
                  : isComplete
                    ? 'Đã hoàn thành'
                    : 'Đánh dấu hoàn thành'}
              </button>
            )}
          </div>
          <LessonNavigation
            courseSlug={course.data.slug}
            next={lessons[lessonIndex + 1]}
            previous={lessons[lessonIndex - 1]}
          />
        </article>
      </div>
      <PublicToast
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, message: '' }))}
        variant={notice.variant}
      />
    </section>
  );
}
