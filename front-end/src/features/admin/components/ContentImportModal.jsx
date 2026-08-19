import { useMemo, useState } from 'react';
import { importAdminContent } from '../../../services/adminService.js';
import { CONTENT_LABELS } from '../constants.js';
import { getErrorMessage } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert } from './AdminFeedback.jsx';

function ImportSummary({ summary }) {
  if (!summary) return null;

  return (
    <div className="admin-import-summary">
      <div>
        <strong>{summary.total || 0}</strong>
        <span>Tổng</span>
      </div>
      <div>
        <strong>{summary.create || 0}</strong>
        <span>Tạo mới</span>
      </div>
      <div>
        <strong>{summary.update || 0}</strong>
        <span>Cập nhật</span>
      </div>
      <div>
        <strong>{summary.link || 0}</strong>
        <span>Liên kết PDF</span>
      </div>
      <div className={summary.error ? 'has-error' : ''}>
        <strong>{summary.error || 0}</strong>
        <span>Lỗi</span>
      </div>
    </div>
  );
}

function actionLabel(action) {
  if (action === 'create') return 'Tạo mới';
  if (action === 'update') return 'Cập nhật';
  if (action === 'link') return 'Liên kết';
  return 'Lỗi';
}

export default function ContentImportModal({
  onClose,
  onImported,
  onUnauthorized,
  type,
}) {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canCommit = useMemo(
    () => preview && preview.summary && preview.summary.error < preview.summary.total,
    [preview],
  );

  function handleFiles(event) {
    const selected = [...(event.target.files || [])];
    event.target.value = '';
    setFiles(selected);
    setPreview(null);
    setError('');
  }

  async function runImport(commit = false) {
    if (!files.length) {
      setError('Vui lòng chọn PDF, XLSX hoặc CSV trước.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await importAdminContent(type, files, commit);
      setPreview(result);
      if (commit) onImported(result);
    } catch (importError) {
      if (onUnauthorized(importError)) return;
      setError(getErrorMessage(importError, 'Không thể import nội dung.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="content-import-title"
        aria-modal="true"
        className="admin-modal admin-import-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="admin-modal__header">
          <div>
            <p className="admin-eyebrow">Import dữ liệu</p>
            <h2 id="content-import-title">Import {CONTENT_LABELS[type].plural}</h2>
          </div>
          <button aria-label="Đóng" className="admin-icon-button" onClick={onClose} type="button">
            <AdminIcon name="close" size={20} />
          </button>
        </div>

        <div className="admin-import-help">
          <p>
            <strong>PDF:</strong> tên file phải giống tiêu đề bài viết hoặc vị trí tuyển dụng.
            Hệ thống sẽ tự tìm và liên kết tài liệu.
          </p>
          <p>
            <strong>Excel/CSV:</strong> dùng cột <code>title</code> hoặc <code>tiêu đề</code>.
            Trùng tên sẽ cập nhật, tên mới sẽ tạo mới.
          </p>
        </div>

        {error && <AdminAlert>{error}</AdminAlert>}

        <label className="admin-import-dropzone">
          <AdminIcon name="download" size={26} />
          <strong>{files.length ? `${files.length} file đã chọn` : 'Chọn file để import'}</strong>
          <span>PDF (có thể chọn nhiều) hoặc 1 file XLSX/CSV · tối đa 10 MB/file</span>
          <input
            accept=".pdf,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            multiple
            onChange={handleFiles}
            type="file"
          />
        </label>

        {files.length > 0 && (
          <div className="admin-import-files">
            {files.map((file) => (
              <span key={`${file.name}-${file.size}`}>{file.name}</span>
            ))}
          </div>
        )}

        {preview && (
          <div className="admin-import-preview">
            <div className="admin-import-preview__heading">
              <div>
                <strong>Kết quả kiểm tra</strong>
                <span>{preview.filename}</span>
              </div>
              <span className="admin-badge">{preview.format === 'pdf' ? 'PDF' : 'Excel/CSV'}</span>
            </div>

            <ImportSummary summary={preview.summary} />

            <div className="admin-import-table-wrap">
              <table className="admin-import-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tên</th>
                    <th>Thao tác</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr className={row.action === 'error' ? 'is-error' : ''} key={`${row.filename || row.title}-${index}`}>
                      <td>{row.rowNumber || index + 1}</td>
                      <td>{row.filename || row.title || '—'}</td>
                      <td>
                        <span className={`admin-import-action admin-import-action--${row.action}`}>
                          {actionLabel(row.action)}
                        </span>
                      </td>
                      <td>{row.message || row.target?.title || 'Sẵn sàng'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="admin-modal__actions">
          <button className="admin-button admin-button--secondary" disabled={loading} onClick={onClose} type="button">
            Đóng
          </button>
          <button
            className="admin-button admin-button--secondary"
            disabled={loading || !files.length}
            onClick={() => runImport(false)}
            type="button"
          >
            {loading && <span className="admin-spinner" />}
            Kiểm tra trước
          </button>
          <button
            className="admin-button admin-button--primary"
            disabled={loading || !canCommit || preview?.committed}
            onClick={() => runImport(true)}
            type="button"
          >
            {loading && <span className="admin-spinner" />}
            {preview?.committed ? 'Đã import' : 'Xác nhận import'}
          </button>
        </div>
      </section>
    </div>
  );
}
