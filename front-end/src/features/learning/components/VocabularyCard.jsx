import '../styles/learning.css';

function hanCharacters(value) {
  return [
    ...new Set(
      Array.from(String(value || '')).filter((char) => /^\p{Script=Han}$/u.test(char)),
    ),
  ];
}

export default function VocabularyCard({
  busy = false,
  item,
  onAskAi,
  onPracticeCharacter,
  onToggleSave,
  saved = false,
}) {
  function playAudio() {
    if (item.audioUrl) new Audio(item.audioUrl).play();
  }

  const characters = hanCharacters(item.simplified);

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
      {onPracticeCharacter && characters.length > 0 && (
        <div
          className="vocabulary-card__characters"
          aria-label={`Luyện viết Hán tự trong ${item.simplified}`}
        >
          <span>Luyện viết</span>
          <div>
            {characters.map((character) => (
              <button
                key={character}
                onClick={() => onPracticeCharacter(character)}
                type="button"
              >
                <strong lang="zh-Hans">{character}</strong>
                <small>Viết</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {(item.exampleChinese || item.examplePinyin || item.exampleVietnamese) && (
        <div className="vocabulary-card__example">
          {item.exampleChinese && <strong lang="zh-Hans">{item.exampleChinese}</strong>}
          {item.examplePinyin && <span>{item.examplePinyin}</span>}
          {item.exampleVietnamese && <p>{item.exampleVietnamese}</p>}
        </div>
      )}
      {onAskAi && (
        <button
          className="vocabulary-card__ai"
          onClick={() => onAskAi(item)}
          type="button"
        >
          <span aria-hidden="true">文</span>
          Hỏi AI
        </button>
      )}
    </article>
  );
}
