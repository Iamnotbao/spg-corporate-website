import { Link } from 'react-router-dom';

function answerText(result) {
  if (result.correctAnswer?.content) return result.correctAnswer.content;
  if (result.correctAnswer?.acceptedAnswers) {
    return result.correctAnswer.acceptedAnswers.join(' / ');
  }
  if (result.correctAnswer?.tokens) {
    return result.correctAnswer.tokens.map((token) => token.content).join(' ');
  }
  return '';
}

export default function QuizResult({ courseSlug, onRetry, result }) {
  const { attempt, courseState } = result;
  const continueLesson = courseState?.continueLesson;
  return (
    <section className={`quiz-result ${attempt.passed ? 'is-passed' : 'is-failed'}`}>
      <div className="quiz-result__summary">
        <span aria-hidden="true">{attempt.passed ? '✓' : '!'}</span>
        <p className="public-eyebrow">Kết quả Quiz</p>
        <h1>{attempt.score}%</h1>
        <strong>{attempt.passed ? 'Bạn đã đạt yêu cầu' : 'Bạn chưa đạt yêu cầu'}</strong>
        <p>
          {attempt.earnedPoints}/{attempt.totalPoints} điểm
        </p>
      </div>
      <div className="quiz-result__details">
        {attempt.results.map((item, index) => (
          <article
            className={item.correct ? 'is-correct' : 'is-incorrect'}
            key={item.questionId}
          >
            <header>
              <strong>
                Câu {index + 1}: {item.question}
              </strong>
              <span>
                {item.earnedPoints}/{item.possiblePoints}
              </span>
            </header>
            <p>{item.correct ? 'Chính xác' : `Đáp án đúng: ${answerText(item)}`}</p>
            {item.explanation && <small>{item.explanation}</small>}
          </article>
        ))}
      </div>
      <div className="quiz-result__actions">
        <button className="button button--secondary" onClick={onRetry} type="button">
          Làm lại Quiz
        </button>
        {continueLesson ? (
          <Link
            className="button button--primary"
            to={`/courses/${courseSlug}/lessons/${continueLesson.slug}`}
          >
            Tiếp tục học
          </Link>
        ) : (
          <Link className="button button--primary" to={`/courses/${courseSlug}`}>
            Về khóa học
          </Link>
        )}
      </div>
    </section>
  );
}
