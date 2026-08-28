import { useEffect, useMemo, useState } from 'react';
import {
  getAdminLessonVocabularyLinks,
  getAdminVocabulary,
} from '../services/adminVocabularyService.js';
import { AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';

export default function AdminLessonVocabularyView({
  lesson,
  onClose,
  onManage,
  onNotify,
  onUnauthorized,
}) {
  const [state, setState] = useState({ status: 'loading', items: [], error: '' });

  useEffect(() => {
    let active = true;
    async function load() {
      setState({ status: 'loading', items: [], error: '' });
      try {
        const links = await getAdminLessonVocabularyLinks(lesson.id);
        const ids = links.data || [];
        const rows = await Promise.all(
          ids.map(async (id) => {
            try {
              const response = await getAdminVocabulary(id);
              return response.data || null;
            } catch (error) {
              if (onUnauthorized(error)) return null;
              return null;
            }
          }),
        );
        if (!active) return;
        setState({ status: 'ready', items: rows.filter(Boolean), error: '' });
      } catch (error) {
        if (!active) return;
        if (onUnauthorized(error)) return;
        setState({
          status: 'error',
          items: [],
          error: error.message || 'Không thể tải từ vựng của bài học.',
        });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [lesson.id, onUnauthorized]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const publishedCount = useMemo(
    () => state.items.filter((item) => item.status === 'published').length,
    [state.items],
  );

  function manage() {
    onClose();
    onManage(lesson);
    onNotify?.('Mở kho từ để thêm hoặc bỏ từ khỏi bài học.');
  }

  return (
    <div className="admin-vocabulary-picker" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="admin-vocabulary-view-title"
        aria-modal="true"
        className="admin-vocabulary-picker__dialog admin-vocabulary-view__dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <p className="admin-eyebrow">Lesson vocabulary</p>
            <h2 id="admin-vocabulary-view-title">Từ vựng của {lesson.title}</h2>
            <span>
              {state.status === 'ready'
                ? `${state.items.length} từ đã gắn · ${publishedCount} từ đã xuất bản`
                : 'Đang tải danh sách từ đã gắn…'}
            </span>
          </div>
          <button aria-label="Đóng" className="admin-icon-button" onClick={onClose} type="button">
            <AdminIcon name="close" size={18} />
          </button>
        </header>

        <div className="admin-vocabulary-picker__table-wrap admin-vocabulary-view__body">
          {state.status === 'loading' && <AdminSkeletonRows count={5} />}
          {state.status === 'error' && (
            <AdminEmpty title="Không tải được danh sách từ">{state.error}</AdminEmpty>
          )}
          {state.status === 'ready' && !state.items.length && (
            <AdminEmpty title="Bài học chưa có từ vựng">
              Mở Quản lý từ để chọn các từ từ kho Vocabulary.
            </AdminEmpty>
          )}
          {state.status === 'ready' && state.items.length > 0 && (
            <table className="admin-table admin-vocabulary-picker__table">
              <thead>
                <tr>
                  <th>Từ</th>
                  <th>Pinyin</th>
                  <th>Nghĩa</th>
                  <th>HSK</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item) => (
                  <tr key={item.id}>
                    <td><strong lang="zh-Hans">{item.simplified}</strong></td>
                    <td>{item.pinyin || '—'}</td>
                    <td>{item.meaningVietnamese || '—'}</td>
                    <td>{item.hskLevel || '—'}</td>
                    <td>
                      <span className={`admin-learning-badge is-${item.status}`}>
                        {item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer>
          <span>Đây là danh sách từ đang được gắn trực tiếp với bài học.</span>
          <div>
            <button className="admin-button admin-button--secondary" onClick={onClose} type="button">
              Đóng
            </button>
            <button className="admin-button admin-button--primary" onClick={manage} type="button">
              <AdminIcon name="book" size={15} /> Quản lý từ
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
