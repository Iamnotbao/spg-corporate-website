import { useId, useState } from 'react';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const initialForm = { email: '', message: '', name: '', phone: '' };

export default function ApplicationForm({ jobId, position, submitApplication }) {
  const fieldPrefix = useId();
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const selectFile = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setError('');

    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      event.target.value = '';
      setFile(null);
      setError('CV vượt quá dung lượng tối đa 5 MB.');
      return;
    }

    setFile(selectedFile);
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setError('');

    try {
      const payload = new FormData();
      Object.entries({ ...form, jobId, position }).forEach(([key, value]) => {
        payload.append(key, value || '');
      });
      if (file) payload.append('cv', file);

      await submitApplication(payload);
      setForm(initialForm);
      setFile(null);
      setStatus('success');
    } catch (submitError) {
      setError(submitError?.message || 'Chưa thể gửi hồ sơ. Vui lòng thử lại.');
      setStatus('idle');
    }
  };

  if (status === 'success') {
    return (
      <div className="public-application-success" role="status">
        <span aria-hidden="true">✓</span>
        <h3>Hồ sơ đã được gửi</h3>
        <p>Cảm ơn bạn đã quan tâm đến SPG. Đội ngũ tuyển dụng sẽ sớm liên hệ.</p>
        <button type="button" onClick={() => setStatus('idle')}>
          Gửi hồ sơ khác
        </button>
      </div>
    );
  }

  return (
    <form className="public-application-form" onSubmit={submit}>
      <div className="public-form-field">
        <label htmlFor={`${fieldPrefix}-name`}>Họ và tên *</label>
        <input
          id={`${fieldPrefix}-name`}
          name="name"
          value={form.name}
          autoComplete="name"
          required
          onChange={updateField}
        />
      </div>

      <div className="public-form-grid">
        <div className="public-form-field">
          <label htmlFor={`${fieldPrefix}-email`}>Email *</label>
          <input
            id={`${fieldPrefix}-email`}
            name="email"
            type="email"
            value={form.email}
            autoComplete="email"
            required
            onChange={updateField}
          />
        </div>
        <div className="public-form-field">
          <label htmlFor={`${fieldPrefix}-phone`}>Số điện thoại</label>
          <input
            id={`${fieldPrefix}-phone`}
            name="phone"
            type="tel"
            value={form.phone}
            autoComplete="tel"
            inputMode="tel"
            onChange={updateField}
          />
        </div>
      </div>

      <div className="public-form-field">
        <label htmlFor={`${fieldPrefix}-cv`}>CV đính kèm</label>
        <input
          className="public-visually-hidden"
          id={`${fieldPrefix}-cv`}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={selectFile}
        />
        <label className="public-file-input" htmlFor={`${fieldPrefix}-cv`}>
          <span>{file ? 'Đổi tệp' : 'Chọn tệp'}</span>
          <small>{file?.name || 'PDF, DOC hoặc DOCX · tối đa 5 MB'}</small>
        </label>
      </div>

      <div className="public-form-field">
        <label htmlFor={`${fieldPrefix}-message`}>Lời nhắn</label>
        <textarea
          id={`${fieldPrefix}-message`}
          name="message"
          rows="4"
          value={form.message}
          onChange={updateField}
        />
      </div>

      {error && (
        <p className="public-form-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="public-button public-button--wide"
        type="submit"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Đang gửi hồ sơ…' : 'Nộp hồ sơ'}
        {status !== 'submitting' && <span aria-hidden="true">↗</span>}
      </button>
      <p className="public-form-note">
        Bằng việc gửi hồ sơ, bạn đồng ý để SPG liên hệ về vị trí này.
      </p>
    </form>
  );
}
