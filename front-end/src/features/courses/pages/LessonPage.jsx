import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import LearningProgress from '../../../components/ui/LearningProgress.jsx';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import PublicToast from '../../../components/ui/PublicToast.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import CharacterCard from '../../learning/components/CharacterCard.jsx';
import CharacterPracticeModal from '../../learning/components/CharacterPracticeModal.jsx';
import VocabularyCard from '../../learning/components/VocabularyCard.jsx';
import { listPublicCharacters } from '../../learning/services/characterService.js';
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
import LessonRelatedVocabulary from '../components/LessonRelatedVocabulary.jsx';
import { getPublicCourse, getPublicLesson } from '../services/courseCatalogService.js';
import '../styles/courses.css';
import '../styles/lesson-discovery.css';
import '../styles/lesson-vocabulary.css';

const TYPE_LABELS = {
  character: 'Hán tự',
  grammar: 'Ngữ pháp',
  listening: 'Luyện nghe',
  practice: 'Luyện tập',
  quiz: 'Quiz',
  reading: 'Đọc hiểu',
  vocabulary: 'Từ vựng',
};

const LESSON_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'incomplete', label: 'Chưa học' },
  { value: 'completed', label: 'Hoàn thành' },
];

const VOCAB_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'saved', label: 'Đã lưu' },
  { value: 'unsaved', label: 'Chưa lưu' },
];

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('vi');
}

export default function LessonPage() {
  const { courseSlug, lessonSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [lessonCharacters, setLessonCharacters] = useState([]);
  const [characterStatus, setCharacterStatus] = useState('idle');
  const [savedIds, setSavedIds] = useState(new Set());
  const [busyVocabularyId, setBusyVocabularyId] = useState('');
  const [practiceCharacter, setPracticeCharacter] = useState('');
  const [notice, setNotice] = useState({ message: '', variant: 'success' });
  const [lessonSearch, setLessonSearch] = useState('');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [lessonTypeFilter, setLessonTypeFilter] = useState('all');
  const [vocabularySearch, setVocabularySearch] = useState('');
  const [vocabularyFilter, setVocabularyFilter] = useState('all');
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [lessonPanel, setLessonPanel] = useState('content');

  const lessons = useMemo(
    () =>
      (course.data?.units || []).flatMap((unit) =>
        unit.lessons.map((item) => ({ ...item, unitTitle: unit.title })),
      ),
    [course.data],
  );
  const lessonIndex = lessons.findIndex((item) => item.slug === lessonSlug);
  const completedLessonIds = studentState?.completedLessonIds || [];
  const completedLessonSet = useMemo(
    () => new Set(completedLessonIds),
    [completedLessonIds],
  );
  const isComplete = completedLessonSet.has(lesson.data?.id);
  const relatedVocabulary = useMemo(
    () => lessonVocabulary.slice(0, 5),
    [lessonVocabulary],
  );
  usePageTitle(lesson.data?.title || 'Bài học');

  const lessonTypes = useMemo(
    () => [...new Set(lessons.map((item) => item.type).filter(Boolean))],
    [lessons],
  );

  const filteredCourse = useMemo(() => {
    if (!course.data) return null;
    const search = normalizeSearch(lessonSearch);
    const units = course.data.units
      .map((unit) => ({
        ...unit,
        lessons: unit.lessons.filter((item) => {
          const matchesSearch =
            !search ||
            normalizeSearch(
              `${item.title} ${unit.title} ${TYPE_LABELS[item.type] || item.type}`,
            ).includes(search);
          const completed = completedLessonSet.has(item.id);
          const matchesStatus =
            lessonFilter === 'all' ||
            (lessonFilter === 'completed' && completed) ||
            (lessonFilter === 'incomplete' && !completed);
          const matchesType =
            lessonTypeFilter === 'all' || item.type === lessonTypeFilter;
          return matchesSearch && matchesStatus && matchesType;
        }),
      }))
      .filter((unit) => unit.lessons.length > 0);
    return { ...course.data, units };
  }, [course.data, completedLessonSet, lessonFilter, lessonSearch, lessonTypeFilter]);

  const filteredVocabulary = useMemo(() => {
    const search = normalizeSearch(vocabularySearch);
    return lessonVocabulary.filter((item) => {
      const haystack = normalizeSearch(
        [
          item.simplified,
          item.traditional,
          item.pinyin,
          item.meaningVietnamese,
          item.meaningEnglish,
          item.exampleChinese,
          item.examplePinyin,
          item.exampleVietnamese,
        ].join(' '),
      );
      const matchesSearch = !search || haystack.includes(search);
      const saved = savedIds.has(item.id);
      const matchesSaved =
        vocabularyFilter === 'all' ||
        (vocabularyFilter === 'saved' && saved) ||
        (vocabularyFilter === 'unsaved' && !saved);
      return matchesSearch && matchesSaved;
    });
  }, [lessonVocabulary, savedIds, vocabularyFilter, vocabularySearch]);

  useEffect(() => {
    setOutlineOpen(false);
    setLessonPanel('content');
  }, [lessonSlug]);

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
    setVocabularySearch('');
    setVocabularyFilter('all');
    listPublicVocabulary({ lessonId: lesson.data.id, page: 1, pageSize: 50 })
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
    if (lesson.data?.type !== 'character' || !lesson.data?.id) {
      setLessonCharacters([]);
      setCharacterStatus('idle');
      return;
    }
    setCharacterStatus('loading');
    listPublicCharacters({ lessonId: lesson.data.id, pageSize: 50 })
      .then((result) => {
        setLessonCharacters(result.data || []);
        setCharacterStatus('ready');
      })
      .catch(() => {
        setLessonCharacters([]);
        setCharacterStatus('error');
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
    if (auth.status !== 'signed-in') {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
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
        message: wasSaved
          ? `Đã bỏ lưu “${item.simplified}”.`
          : `Đã lưu “${item.simplified}” để ôn lại.`,
        variant: 'success',
      });
    } catch (error) {
      setNotice({
        message: error.message || 'Không thể cập nhật từ đã lưu.',
        variant: 'error',
      });
    } finally {
      setBusyVocabularyId('');
    }
  }

  function askAiAboutVocabulary(item) {
    const destination = `/ai-tutor?vocabulary=${encodeURIComponent(item.id)}`;
    const state = {
      initialPrompt: `Hãy giải thích cách dùng từ ${item.simplified} và cho ví dụ dễ nhớ.`,
    };
    if (auth.status !== 'signed-in') {
      navigate('/login', { state: { from: destination } });
      return;
    }
    navigate(destination, { state });
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
  const isVocabularyLesson = lesson.data.type === 'vocabulary';
  const quizUrl = `/courses/${courseSlug}/lessons/${lessonSlug}/quiz`;

  const outlineControls = (
    <>
      <label className="lesson-outline-search">
        <span>⌕</span>
        <input
          aria-label="Tìm bài học"
          onChange={(event) => setLessonSearch(event.target.value)}
          placeholder="Tìm bài học…"
          type="search"
          value={lessonSearch}
        />
      </label>
      <div className="lesson-outline-filters" aria-label="Lọc trạng thái bài học">
        {LESSON_FILTERS.map((filter) => (
          <button
            className={lessonFilter === filter.value ? 'is-active' : undefined}
            key={filter.value}
            onClick={() => setLessonFilter(filter.value)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>
      <select
        aria-label="Lọc loại bài học"
        className="lesson-outline-type"
        onChange={(event) => setLessonTypeFilter(event.target.value)}
        value={lessonTypeFilter}
      >
        <option value="all">Tất cả loại bài</option>
        {lessonTypes.map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type] || type}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <section className="lesson-page">
      <div
        className={`public-container lesson-page__grid${
          isVocabularyLesson ? ' lesson-page__grid--with-related' : ''
        }`}
      >
        <aside className="lesson-sidebar">
          <Link className="breadcrumb-link" to={`/courses/${course.data.slug}`}>
            ← {course.data.title}
          </Link>
          <div className="lesson-outline-tools">{outlineControls}</div>
          <div className="lesson-outline-scroll">
            <CourseOutline
              compact
              completedLessonIds={completedLessonIds}
              course={filteredCourse}
              currentLessonSlug={lesson.data.slug}
            />
          </div>
        </aside>

        <button
          aria-expanded={outlineOpen}
          className="lesson-outline-mobile-trigger"
          onClick={() => setOutlineOpen(true)}
          type="button"
        >
          ☰ Mục lục khóa học
        </button>

        {outlineOpen && (
          <div className="lesson-outline-drawer" role="dialog" aria-modal="true">
            <button
              aria-label="Đóng mục lục"
              className="lesson-outline-drawer__backdrop"
              onClick={() => setOutlineOpen(false)}
              type="button"
            />
            <aside className="lesson-outline-drawer__panel">
              <header>
                <div>
                  <small>Mục lục khóa học</small>
                  <strong>{course.data.title}</strong>
                </div>
                <button
                  onClick={() => setOutlineOpen(false)}
                  type="button"
                  aria-label="Đóng"
                >
                  ×
                </button>
              </header>
              <div className="lesson-outline-tools">{outlineControls}</div>
              <div className="lesson-outline-scroll">
                <CourseOutline
                  compact
                  completedLessonIds={completedLessonIds}
                  course={filteredCourse}
                  currentLessonSlug={lesson.data.slug}
                  onLessonNavigate={() => setOutlineOpen(false)}
                />
              </div>
            </aside>
          </div>
        )}

        <article className="lesson-content">
          <header className="lesson-header">
            <div>
              <span>{lesson.data.unit?.title}</span>
              <span>{TYPE_LABELS[lesson.data.type] || lesson.data.type}</span>
            </div>
            <h1>{lesson.data.title}</h1>
            {lesson.data.description && <p>{lesson.data.description}</p>}
            <Link
              className="button button--secondary lesson-header__ai"
              state={{
                initialPrompt:
                  'Hãy giải thích nội dung chính và điểm cần nhớ trong bài học này.',
              }}
              to={`/ai-tutor?lesson=${encodeURIComponent(lesson.data.id)}`}
            >
              <span aria-hidden="true">文</span>
              Hỏi AI về bài này
            </Link>
          </header>

          {isVocabularyLesson && (
            <nav className="lesson-content-tabs" aria-label="Nội dung bài học">
              <button
                aria-selected={lessonPanel === 'content'}
                className={lessonPanel === 'content' ? 'is-active' : undefined}
                onClick={() => setLessonPanel('content')}
                role="tab"
                type="button"
              >
                <span>Nội dung bài học</span>
                <small>Đọc lý thuyết & ví dụ</small>
              </button>
              <button
                aria-selected={lessonPanel === 'vocabulary'}
                className={lessonPanel === 'vocabulary' ? 'is-active' : undefined}
                onClick={() => setLessonPanel('vocabulary')}
                role="tab"
                type="button"
              >
                <span>Từ vựng</span>
                <small>
                  {vocabularyStatus === 'ready'
                    ? `${lessonVocabulary.length} từ trong bài`
                    : 'Đang tải danh sách'}
                </small>
              </button>
            </nav>
          )}

          {(!isVocabularyLesson || lessonPanel === 'content') && (
            <div className="lesson-panel lesson-panel--content">
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
              {isVocabularyLesson && lessonVocabulary.length > 0 && (
                <button
                  className="lesson-panel-next"
                  onClick={() => {
                    setLessonPanel('vocabulary');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  type="button"
                >
                  Học {lessonVocabulary.length} từ vựng của bài →
                </button>
              )}
            </div>
          )}

          {isVocabularyLesson && lessonPanel === 'vocabulary' && (
            <section className="lesson-vocabulary-section lesson-vocabulary-section--tabbed">
              <div className="lesson-vocabulary-section__heading">
                <div>
                  <span>Từ vựng trong bài</span>
                  <h2>Học từ và luyện viết ngay trong Lesson</h2>
                </div>
                <Link to="/vocabulary">Xem toàn bộ từ vựng →</Link>
              </div>

              {vocabularyStatus === 'ready' && lessonVocabulary.length > 0 && (
                <div className="lesson-vocabulary-toolbar">
                  <label className="lesson-vocabulary-search">
                    <span>⌕</span>
                    <input
                      aria-label="Tìm từ vựng trong bài"
                      onChange={(event) => setVocabularySearch(event.target.value)}
                      placeholder="Tìm chữ Hán, pinyin, nghĩa…"
                      type="search"
                      value={vocabularySearch}
                    />
                  </label>
                  <div className="lesson-vocabulary-filters" aria-label="Lọc từ vựng">
                    {VOCAB_FILTERS.map((filter) => (
                      <button
                        className={
                          vocabularyFilter === filter.value ? 'is-active' : undefined
                        }
                        key={filter.value}
                        onClick={() => setVocabularyFilter(filter.value)}
                        type="button"
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <small>
                    Hiển thị {filteredVocabulary.length} / {lessonVocabulary.length} từ
                  </small>
                </div>
              )}

              {vocabularyStatus === 'loading' && (
                <LoadingState count={4} label="Đang tải từ vựng" />
              )}
              {vocabularyStatus === 'error' && (
                <p className="lesson-vocabulary-empty">
                  Không thể tải từ vựng của bài học này.
                </p>
              )}
              {vocabularyStatus === 'ready' && lessonVocabulary.length === 0 && (
                <p className="lesson-vocabulary-empty">
                  Bài học này chưa có từ vựng được xuất bản.
                </p>
              )}
              {vocabularyStatus === 'ready' &&
                lessonVocabulary.length > 0 &&
                filteredVocabulary.length === 0 && (
                  <p className="lesson-vocabulary-empty">
                    Không có từ vựng phù hợp với bộ lọc.
                  </p>
                )}
              {vocabularyStatus === 'ready' && filteredVocabulary.length > 0 && (
                <div className="lesson-vocabulary-grid">
                  {filteredVocabulary.map((item) => (
                    <VocabularyCard
                      busy={busyVocabularyId === item.id}
                      item={item}
                      key={item.id}
                      onAskAi={askAiAboutVocabulary}
                      onPracticeCharacter={setPracticeCharacter}
                      onToggleSave={toggleSaveVocabulary}
                      saved={savedIds.has(item.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {lesson.data.type === 'character' && (
            <section className="lesson-vocabulary-section">
              <div className="lesson-vocabulary-section__heading">
                <div>
                  <span>Hán tự trong bài</span>
                  <h2>Luyện viết ngay trong Lesson</h2>
                </div>
                <Link to="/characters">Xem toàn bộ Hán tự →</Link>
              </div>
              {characterStatus === 'loading' && (
                <LoadingState count={3} label="Đang tải Hán tự" />
              )}
              {characterStatus === 'error' && (
                <p className="lesson-vocabulary-empty">
                  Không thể tải Hán tự của bài học này.
                </p>
              )}
              {characterStatus === 'ready' && lessonCharacters.length === 0 && (
                <p className="lesson-vocabulary-empty">
                  Bài học này chưa có Hán tự được xuất bản.
                </p>
              )}
              {characterStatus === 'ready' && lessonCharacters.length > 0 && (
                <div className="character-catalog-grid">
                  {lessonCharacters.map((item) => (
                    <CharacterCard item={item} key={item.id} />
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

        {isVocabularyLesson && (
          <LessonRelatedVocabulary
            items={relatedVocabulary}
            status={vocabularyStatus}
            total={lessonVocabulary.length}
          />
        )}
      </div>
      <CharacterPracticeModal
        character={practiceCharacter}
        onClose={() => setPracticeCharacter('')}
      />
      <PublicToast
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, message: '' }))}
        variant={notice.variant}
      />
    </section>
  );
}
