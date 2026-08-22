function ChoiceQuestion({ answer, onChange, question }) {
  return (
    <fieldset className="quiz-question__choices">
      <legend className="visually-hidden">Chọn một đáp án</legend>
      {question.options.map((option) => (
        <label key={option.id}>
          <input
            checked={answer === option.id}
            name={`question-${question.id}`}
            onChange={() => onChange(option.id)}
            type="radio"
          />
          <span>{option.content}</span>
        </label>
      ))}
    </fieldset>
  );
}

function ArrangeQuestion({ answer = [], onChange, question }) {
  const selected = answer
    .map((id) => question.tokens.find((token) => token.id === id))
    .filter(Boolean);
  const available = question.tokens.filter((token) => !answer.includes(token.id));
  return (
    <div className="quiz-arrange">
      <div aria-label="Câu đã sắp xếp" className="quiz-arrange__selected">
        {selected.length ? (
          selected.map((token) => (
            <button
              key={token.id}
              onClick={() => onChange(answer.filter((id) => id !== token.id))}
              type="button"
            >
              {token.content} <span aria-hidden="true">×</span>
            </button>
          ))
        ) : (
          <span>Chọn từng thành phần theo đúng thứ tự.</span>
        )}
      </div>
      <div aria-label="Các thành phần chưa chọn" className="quiz-arrange__tokens">
        {available.map((token) => (
          <button
            key={token.id}
            onClick={() => onChange([...answer, token.id])}
            type="button"
          >
            {token.content}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuizQuestion({ answer, index, onChange, question }) {
  return (
    <section className="quiz-question" aria-labelledby={`quiz-question-${question.id}`}>
      <header>
        <span>Câu {index + 1}</span>
        <small>{question.points} điểm</small>
      </header>
      <h2 id={`quiz-question-${question.id}`}>{question.question}</h2>
      {['multiple_choice', 'true_false'].includes(question.type) && (
        <ChoiceQuestion answer={answer} onChange={onChange} question={question} />
      )}
      {question.type === 'fill_blank' && (
        <label className="quiz-question__blank">
          <span className="visually-hidden">Nhập câu trả lời</span>
          <input
            onChange={(event) => onChange(event.target.value)}
            placeholder="Nhập câu trả lời…"
            type="text"
            value={answer || ''}
          />
        </label>
      )}
      {question.type === 'arrange_sentence' && (
        <ArrangeQuestion answer={answer} onChange={onChange} question={question} />
      )}
    </section>
  );
}
