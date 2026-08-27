import { useEffect, useMemo, useState } from 'react';
import AdminIcon from './AdminIcon.jsx';

const TYPE_LABELS = {
  multiple_choice: 'Một lựa chọn',
  true_false: 'Đúng / Sai',
  fill_blank: 'Điền chỗ trống',
  arrange_sentence: 'Sắp xếp câu',
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

function initialForm(question, defaultType = 'multiple_choice') {
  return question
    ? {
        ...question,
        acceptedAnswersText: (question.acceptedAnswers || []).join('\n'),
        tokensText: (question.tokens || []).join('\n'),
      }
    : {
        question: '',
        type: defaultType,
        explanation: '',
        points: '1',
        order: '0',
        audioUrl: '',
        imageUrl: '',
        options: [
          { content: '', isCorrect: true, order: 0 },
          { content: '', isCorrect: false, order: 1 },
        ],
        acceptedAnswersText: '',
        tokensText: '',
      };
}

function questionPayload(form, allowMedia, fixedPoints) {
  const payload = {
    question: form.question,
    type: form.type,
    explanation: form.explanation,
    points: fixedPoints ?? Number(form.points),
    order: Number(form.order),
  };
  if (allowMedia) {
    payload.audioUrl = form.audioUrl || '';
    payload.imageUrl = form.imageUrl || '';
  }
  if (['multiple_choice', 'true_false'].includes(form.type)) {
    payload.options = form.options.map((option, index) => ({
      ...(option.id ? { id: option.id } : {}),
      content: option.content,
      isCorrect: option.isCorrect,
      order: index,
    }));
  } else if (form.type === 'fill_blank') {
    payload.acceptedAnswers = form.acceptedAnswersText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  } else {
    payload.tokens = form.tokensText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return payload;
}

export default function AdminQuestionEditor({
  allowMedia = false,
  allowedTypes = ALL_TYPES,
  defaultType,
  fixedPoints,
  mediaHint = '',
  onCancel,
  onSave,
  question,
  requireAudio = false,
  saving,
}) {
  const supportedTypes = useMemo(
    () => (allowedTypes?.length ? allowedTypes : ALL_TYPES),
    [allowedTypes],
  );
  const firstType = defaultType || supportedTypes[0] || 'multiple_choice';
  const [form, setForm] = useState(() => initialForm(question, firstType));

  useEffect(() => {
    const next = initialForm(question, firstType);
    if (!supportedTypes.includes(next.type)) next.type = firstType;
    setForm(next);
  }, [firstType, question, supportedTypes]);

  function changeType(type) {
    setForm((current) => ({
      ...current,
      type,
      options:
        type === 'true_false'
          ? [
              { content: 'Đúng', isCorrect: true, order: 0 },
              { content: 'Sai', isCorrect: false, order: 1 },
            ]
          : type === 'multiple_choice'
            ? current.options?.length >= 2
              ? current.options
              : initialForm(null, firstType).options
            : [],
    }));
  }

  function updateOption(index, update) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...update } : option,
      ),
    }));
  }

  return (
    <form
      className="admin-form-section admin-question-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(questionPayload(form, allowMedia, fixedPoints));
      }}
    >
      <div className="admin-form-section__heading">
        <span>
          <AdminIcon name="edit" size={16} />
        </span>
        <div>
          <h3>{question ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi'}</h3>
          <p>
            Chỉ các kiểu câu phù hợp với phần thi hiện tại được hiển thị. Đáp án đúng chỉ
            được gửi cho học viên sau khi backend chấm.
          </p>
        </div>
      </div>
      <div className="admin-form-grid">
        <label className="admin-form-field admin-learning-field--full">
          <span>
            Câu hỏi <b>*</b>
          </span>
          <textarea
            name="question"
            onChange={(event) => setForm({ ...form, question: event.target.value })}
            required
            value={form.question}
          />
        </label>
        {allowMedia && (
          <>
            <label className="admin-form-field">
              <span>{requireAudio ? 'Audio URL *' : 'Audio URL (tùy chọn)'}</span>
              <input
                required={requireAudio}
                type="url"
                value={form.audioUrl || ''}
                onChange={(event) => setForm({ ...form, audioUrl: event.target.value })}
              />
              {mediaHint && <small>{mediaHint}</small>}
            </label>
            <label className="admin-form-field">
              <span>Image URL (tùy chọn)</span>
              <input
                type="url"
                value={form.imageUrl || ''}
                onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
              />
            </label>
          </>
        )}
        <label className="admin-form-field">
          <span>
            Loại câu hỏi <b>*</b>
          </span>
          <select onChange={(event) => changeType(event.target.value)} value={form.type}>
            {supportedTypes.map((value) => (
              <option key={value} value={value}>
                {TYPE_LABELS[value] || value}
              </option>
            ))}
          </select>
        </label>
        {fixedPoints == null ? (
          <label className="admin-form-field">
            <span>
              Điểm <b>*</b>
            </span>
            <input
              min="1"
              onChange={(event) => setForm({ ...form, points: event.target.value })}
              required
              type="number"
              value={form.points}
            />
          </label>
        ) : (
          <div className="admin-form-field">
            <span>Trọng số câu hỏi</span>
            <div className="admin-hsk-fixed-score">
              Mỗi câu = {fixedPoints} điểm nội bộ; điểm HSK được chuẩn hóa theo từng phần.
            </div>
          </div>
        )}
        <label className="admin-form-field">
          <span>
            Thứ tự <b>*</b>
          </span>
          <input
            min="0"
            onChange={(event) => setForm({ ...form, order: event.target.value })}
            required
            type="number"
            value={form.order}
          />
        </label>
        <label className="admin-form-field admin-learning-field--full">
          <span>Giải thích sau khi chấm</span>
          <textarea
            onChange={(event) => setForm({ ...form, explanation: event.target.value })}
            value={form.explanation || ''}
          />
        </label>
      </div>
      {['multiple_choice', 'true_false'].includes(form.type) && (
        <fieldset className="admin-question-options">
          <legend>
            Đáp án <b>*</b>
          </legend>
          {form.options.map((option, index) => (
            <div key={option.id || index}>
              <input
                aria-label={`Đáp án đúng ${index + 1}`}
                checked={option.isCorrect}
                name="correct-option"
                onChange={() =>
                  setForm((current) => ({
                    ...current,
                    options: current.options.map((item, itemIndex) => ({
                      ...item,
                      isCorrect: itemIndex === index,
                    })),
                  }))
                }
                type="radio"
              />
              <input
                onChange={(event) => updateOption(index, { content: event.target.value })}
                placeholder={`Đáp án ${index + 1}`}
                required
                value={option.content}
              />
              {form.type === 'multiple_choice' && form.options.length > 2 && (
                <button
                  aria-label={`Xóa đáp án ${index + 1}`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      options: current.options.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {form.type === 'multiple_choice' && form.options.length < 10 && (
            <button
              className="admin-button admin-button--secondary"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  options: [
                    ...current.options,
                    { content: '', isCorrect: false, order: current.options.length },
                  ],
                }))
              }
              type="button"
            >
              Thêm đáp án
            </button>
          )}
        </fieldset>
      )}
      {form.type === 'fill_blank' && (
        <label className="admin-form-field">
          <span>
            Đáp án được chấp nhận, mỗi dòng một đáp án <b>*</b>
          </span>
          <textarea
            onChange={(event) =>
              setForm({ ...form, acceptedAnswersText: event.target.value })
            }
            required
            value={form.acceptedAnswersText}
          />
        </label>
      )}
      {form.type === 'arrange_sentence' && (
        <label className="admin-form-field">
          <span>
            Các thành phần theo thứ tự đúng, mỗi dòng một phần <b>*</b>
          </span>
          <textarea
            onChange={(event) => setForm({ ...form, tokensText: event.target.value })}
            required
            value={form.tokensText}
          />
        </label>
      )}
      <div className="admin-learning-form__actions">
        <button
          className="admin-button admin-button--secondary"
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
        <button
          className="admin-button admin-button--primary"
          disabled={saving}
          type="submit"
        >
          {saving ? 'Đang lưu…' : 'Lưu câu hỏi'}
        </button>
      </div>
    </form>
  );
}
