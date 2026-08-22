import '../styles/learning.css';

export default function CharacterCard({ active, item, onSelect }) {
  return (
    <button
      aria-pressed={active}
      className={`character-card${active ? ' is-active' : ''}`}
      onClick={() => onSelect(item)}
      type="button"
    >
      <strong lang="zh-Hans">{item.simplified}</strong>
      <div>
        <span>{item.pinyin}</span>
        <p>{item.meaning}</p>
      </div>
      <small>{item.level}</small>
    </button>
  );
}
