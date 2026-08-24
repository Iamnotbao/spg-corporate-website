import { Link } from 'react-router-dom';
import '../styles/learning.css';

export default function CharacterCard({ item }) {
  return (
    <Link
      aria-label={`Luyện viết chữ ${item.simplified}, ${item.pinyin}, ${item.meaningVietnamese}`}
      className="character-card"
      to={`/characters/${encodeURIComponent(item.simplified)}/practice`}
    >
      <strong lang="zh-Hans">{item.simplified}</strong>
      <div>
        <span>{item.pinyin}</span>
        <p>{item.meaningVietnamese}</p>
      </div>
      <small>{item.hskLevel}</small>
    </Link>
  );
}
