import { Link } from 'react-router-dom';
import '../styles/learning.css';

export default function HskLevelCard({ item }) {
  return (
    <Link
      className="hsk-level-card"
      to={`/courses?level=${encodeURIComponent(`HSK ${item.level}`)}`}
    >
      <span className="hsk-level-card__number">{item.level}</span>
      <div>
        <p>HSK {item.level}</p>
        <h3>{item.label}</h3>
        <span>{item.description}</span>
      </div>
      <i aria-hidden="true">→</i>
    </Link>
  );
}
