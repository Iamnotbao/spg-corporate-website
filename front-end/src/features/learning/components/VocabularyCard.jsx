import '../styles/learning.css';

export default function VocabularyCard({ item }) {
  return (
    <article className="vocabulary-card">
      <header>
        <span>{item.level}</span>
        <div className="vocabulary-card__actions">
          <button
            aria-label={`Nghe phát âm ${item.simplified} — chưa khả dụng`}
            disabled
            type="button"
          >
            ◖))
          </button>
          <button
            aria-label={`Lưu từ ${item.simplified} — chưa khả dụng`}
            disabled
            type="button"
          >
            ♡
          </button>
        </div>
      </header>
      <div className="vocabulary-card__word">
        <strong lang="zh-Hans">{item.simplified}</strong>
        {item.traditional !== item.simplified && (
          <small lang="zh-Hant">Phồn thể · {item.traditional}</small>
        )}
        <span>{item.pinyin}</span>
        <p>{item.meaning}</p>
      </div>
      <div className="vocabulary-card__example">
        <strong lang="zh-Hans">{item.example}</strong>
        <span>{item.examplePinyin}</span>
        <p>{item.exampleMeaning}</p>
      </div>
    </article>
  );
}
