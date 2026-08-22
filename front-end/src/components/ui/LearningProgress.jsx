export default function LearningProgress({ label = 'Tiến độ', value }) {
  if (!Number.isFinite(value)) return null;

  const normalized = Math.min(100, Math.max(0, value));

  return (
    <div className="learning-progress">
      <div>
        <span>{label}</span>
        <strong>{normalized}%</strong>
      </div>
      <span
        aria-label={`${label}: ${normalized}%`}
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={normalized}
        className="learning-progress__track"
        role="progressbar"
      >
        <i style={{ width: `${normalized}%` }} />
      </span>
    </div>
  );
}
