import { Link } from 'react-router-dom';

export default function LessonRelatedVocabulary({ items = [], status, total = 0 }) {
  return (
    <aside className="lesson-related-rail" aria-label="Từ vựng liên quan trong bài">
      <div className="lesson-related-card">
        <span className="lesson-related-card__eyebrow">Ôn nhanh</span>
        <h2>Từ liên quan</h2>
        <p>Các từ cùng bài học để bạn nhìn lại nhanh trong lúc học.</p>

        {status === 'loading' && (
          <div className="lesson-related-card__state">Đang tải từ trong bài…</div>
        )}
        {status === 'error' && (
          <div className="lesson-related-card__state">Không thể tải từ liên quan.</div>
        )}
        {status === 'ready' && items.length === 0 && (
          <div className="lesson-related-card__state">Chưa có từ được xuất bản.</div>
        )}
        {status === 'ready' && items.length > 0 && (
          <div className="lesson-related-list">
            {items.slice(0, 5).map((item) => (
              <article className="lesson-related-item" key={item.id}>
                <strong>{item.simplified}</strong>
                <div>
                  <span>{item.pinyin}</span>
                  <small>{item.meaningVietnamese}</small>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="lesson-related-card__footer">
          <span>{total} từ trong bài</span>
          <Link to="/vocabulary">Mở từ điển →</Link>
        </div>
      </div>
    </aside>
  );
}
