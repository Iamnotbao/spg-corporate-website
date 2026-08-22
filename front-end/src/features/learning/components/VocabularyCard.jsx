import '../styles/learning.css';

export default function VocabularyCard({
  busy = false,
  item,
  onToggleSave,
  saved = false,
}) {
  function playAudio() {
    if (item.audioUrl) new Audio(item.audioUrl).play();
  }

  return (
    <article className="vocabulary-card">
      <header>
        <span>{item.hskLevel}</span>
        <div className="vocabulary-card__actions">
          <button
            aria-label={`Nghe phát âm ${item.simplified}`}
            disabled={!item.audioUrl}
            onClick={playAudio}
            type="button"
          >
            ◖))
          </button>
          <button
            aria-pressed={saved}
            aria-label={`${saved ? 'Bỏ lưu' : 'Lưu'} từ ${item.simplified}`}
            disabled={busy}
            onClick={() => onToggleSave(item)}
            type="button"
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
      </header>
      <div className="vocabulary-card__word">
        <strong lang="zh-Hans">{item.simplified}</strong>
        {item.traditional && item.traditional !== item.simplified && (
          <small lang="zh-Hant">Phồn thể · {item.traditional}</small>
        )}
        <span>{item.pinyin}</span>
        <p>{item.meaningVietnamese}</p>
      </div>
      {(item.exampleChinese || item.examplePinyin || item.exampleVietnamese) && (
        <div className="vocabulary-card__example">
          {item.exampleChinese && <strong lang="zh-Hans">{item.exampleChinese}</strong>}
          {item.examplePinyin && <span>{item.examplePinyin}</span>}
          {item.exampleVietnamese && <p>{item.exampleVietnamese}</p>}
        </div>
      )}
    </article>
  );
}
