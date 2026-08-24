import { useEffect, useMemo, useRef, useState } from 'react';
import { listAdminLessonOptions } from '../../../services/adminService.js';
import { createAdminVocabulary } from '../services/adminVocabularyService.js';
import { parseVocabularyFile } from '../utils/vocabularyCsv.js';
import AdminIcon from './AdminIcon.jsx';
import AdminPagination from './AdminPagination.jsx';

const PREVIEW_PAGE_SIZE = 8;

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('vi');
}

function duplicateKey(row, lessonId) {
  return `${lessonId}::${normalize(row.simplified)}::${normalize(row.pinyin)}`;
}

function payloadFrom(row, lessonId, status) {
  return {
    simplified: String(row.simplified || '').trim(),
    traditional: String(row.traditional || '').trim(),
    pinyin: String(row.pinyin || '').trim(),
    meaningVietnamese: String(row.meaningVietnamese || '').trim(),
    meaningEnglish: String(row.meaningEnglish || '').trim(),
    hskLevel: String(row.hskLevel || 'HSK 1').trim(),
    lessonId,
    status,
    audioUrl: String(row.audioUrl || '').trim(),
    exampleChinese: String(row.exampleChinese || '').trim(),
    examplePinyin: String(row.examplePinyin || '').trim(),
    exampleVietnamese: String(row.exampleVietnamese || '').trim(),
  };
}

export default function AdminVocabularyImportDialog({
  existingItems,
  onClose,
  onImported,
  onNotify,
  onUnauthorized,
  open,
}) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [lessonSearch, setLessonSearch] = useState('');
  const [lessonPage, setLessonPage] = useState(1);
  const [lessonState, setLessonState] = useState({ data: [], pagination: null, loading: false });
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [status, setStatus] = useState('draft');
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [selectedRows, setSelectedRows] = useState(() => new Set());
  const [previewPage, setPreviewPage] = useState(1);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLessonState((current) => ({ ...current, loading: true }));
      try {
        const response = await listAdminLessonOptions({
          page: lessonPage,
          pageSize: 8,
          search: lessonSearch,
          signal: controller.signal,
        });
        setLessonState({ data: response.data || [], pagination: response.pagination, loading: false });
      } catch (caught) {
        if (caught.name === 'AbortError') return;
        if (caught.status === 401 && onUnauthorized(caught)) return;
        setError(caught.message || 'Không thể tải danh sách bài học.');
        setLessonState((current) => ({ ...current, loading: false }));
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lessonPage, lessonSearch, onUnauthorized, open]);

  useEffect(() => {
    if (!open) return;
    setLessonPage(1);
  }, [lessonSearch, open]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setRows([]);
      setSelectedLesson(null);
      setSelectedRows(new Set());
      setPreviewPage(1);
      setError('');
      setAllowDuplicates(false);
    }
  }, [open]);

  const existingKeys = useMemo(
    () => new Set((existingItems || []).map((item) => duplicateKey(item, item.lessonId))),
    [existingItems],
  );

  const reviewedRows = useMemo(() => {
    const seen = new Set();
    return rows.map((row, index) => {
      const key = duplicateKey(row, selectedLesson?.id || '');
      const duplicateInFile = seen.has(key);
      seen.add(key);
      return {
        ...row,
        __index: index,
        __duplicate: Boolean(selectedLesson && (existingKeys.has(key) || duplicateInFile)),
      };
    });
  }, [existingKeys, rows, selectedLesson]);

  const duplicateCount = reviewedRows.filter((row) => row.__duplicate).length;
  const eligibleRows = reviewedRows.filter(
    (row) => selectedRows.has(row.__index) && (allowDuplicates || !row.__duplicate),
  );
  const previewTotalPages = Math.max(1, Math.ceil(reviewedRows.length / PREVIEW_PAGE_SIZE));
  const safePreviewPage = Math.min(previewPage, previewTotalPages);
  const previewRows = reviewedRows.slice(
    (safePreviewPage - 1) * PREVIEW_PAGE_SIZE,
    safePreviewPage * PREVIEW_PAGE_SIZE,
  );

  async function chooseFile(nextFile) {
    if (!nextFile) return;
    setParsing(true);
    setError('');
    try {
      const parsed = await parseVocabularyFile(nextFile);
      if (!parsed.length) throw new Error('File không có dữ liệu để import.');
      if (parsed.length > 500) throw new Error('Mỗi lần chỉ import tối đa 500 từ.');
      setFile(nextFile);
      setRows(parsed);
      setSelectedRows(new Set(parsed.map((_, index) => index)));
      setPreviewPage(1);
    } catch (caught) {
      setError(caught.message || 'Không thể đọc file import.');
    } finally {
      setParsing(false);
    }
  }

  function toggleRow(index) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function togglePreviewPage() {
    const indexes = previewRows.map((row) => row.__index);
    const allSelected = indexes.every((index) => selectedRows.has(index));
    setSelectedRows((current) => {
      const next = new Set(current);
      indexes.forEach((index) => (allSelected ? next.delete(index) : next.add(index)));
      return next;
    });
  }

  async function commitImport() {
    if (!selectedLesson) {
      setError('Hãy chọn bài học đích trước khi import.');
      return;
    }
    if (!eligibleRows.length) {
      setError('Không có dòng nào đủ điều kiện để import.');
      return;
    }

    setImporting(true);
    setError('');
    const failures = [];
    let created = 0;
    for (const row of eligibleRows) {
      try {
        await createAdminVocabulary(payloadFrom(row, selectedLesson.id, status));
        created += 1;
      } catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) {
          setImporting(false);
          return;
        }
        failures.push(`dòng ${row.__row}: ${caught.message || 'không thể tạo'}`);
      }
    }

    setImporting(false);
    await onImported();
    if (failures.length) {
      setError(`Đã import ${created}/${eligibleRows.length}. ${failures.slice(0, 4).join(' · ')}`);
      onNotify(`Import được ${created}/${eligibleRows.length} từ.`, 'error');
      return;
    }
    onNotify(`Đã import ${created} từ vào “${selectedLesson.title}”.`);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="admin-import-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !importing) onClose();
    }}>
      <section className="admin-import-dialog" role="dialog" aria-modal="true" aria-labelledby="vocab-import-title">
        <header className="admin-import-dialog__header">
          <div>
            <p className="admin-eyebrow">Import Vocabulary</p>
            <h2 id="vocab-import-title">Review trước khi nhập dữ liệu</h2>
            <p>Chọn Lesson bằng API, xem trước từng dòng và quyết định cách xử lý dữ liệu trùng.</p>
          </div>
          <button className="admin-icon-button" aria-label="Đóng" disabled={importing} onClick={onClose} type="button"><AdminIcon name="close" size={18} /></button>
        </header>

        <div className="admin-import-grid">
          <section className="admin-import-step">
            <span className="admin-import-step__number">1</span>
            <div className="admin-import-step__body">
              <h3>Chọn bài học</h3>
              <label className="admin-import-search"><AdminIcon name="search" size={17} /><input value={lessonSearch} onChange={(event) => setLessonSearch(event.target.value)} placeholder="Tìm theo tên, slug, loại hoặc trạng thái…" /></label>
              <div className="admin-import-lessons">
                {lessonState.loading ? <p>Đang tìm bài học…</p> : lessonState.data.map((lesson) => (
                  <button className={selectedLesson?.id === lesson.id ? 'is-selected' : ''} key={lesson.id} onClick={() => setSelectedLesson(lesson)} type="button">
                    <span><strong>{lesson.title}</strong><small>{lesson.type} · {lesson.status}</small></span>
                    {selectedLesson?.id === lesson.id && <AdminIcon name="check" size={17} />}
                  </button>
                ))}
              </div>
              {lessonState.pagination && <AdminPagination onPageChange={setLessonPage} pagination={lessonState.pagination} />}
            </div>
          </section>

          <section className="admin-import-step">
            <span className="admin-import-step__number">2</span>
            <div className="admin-import-step__body">
              <h3>Chọn file & trạng thái</h3>
              <div className="admin-import-file-row">
                <button className="admin-button admin-button--secondary" disabled={parsing || importing} onClick={() => fileRef.current?.click()} type="button">{parsing ? 'Đang đọc…' : file ? 'Đổi file' : 'Chọn Excel / CSV'}</button>
                <input ref={fileRef} accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} type="file" />
                <span>{file?.name || 'Chưa chọn file'}</span>
              </div>
              <label className="admin-import-status"><span>Trạng thái sau import</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select></label>
              {duplicateCount > 0 && (
                <div className="admin-import-duplicates">
                  <strong>Phát hiện {duplicateCount} dòng trùng</strong>
                  <p>Trùng được xác định theo Lesson + giản thể + Pinyin.</p>
                  <label><input checked={!allowDuplicates} onChange={() => setAllowDuplicates(false)} type="radio" /> Bỏ qua dòng trùng</label>
                  <label><input checked={allowDuplicates} onChange={() => setAllowDuplicates(true)} type="radio" /> Vẫn cho phép import trùng</label>
                </div>
              )}
            </div>
          </section>
        </div>

        {rows.length > 0 && (
          <section className="admin-import-preview">
            <div className="admin-import-preview__summary">
              <div><strong>{rows.length} dòng trong file</strong><span>{selectedRows.size} đã chọn · {eligibleRows.length} sẽ import · {duplicateCount} trùng</span></div>
              <button className="admin-button admin-button--secondary" onClick={togglePreviewPage} type="button">Chọn / bỏ trang này</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table admin-learning-table">
                <thead><tr><th className="admin-learning-select-cell"></th><th>Từ</th><th>Pinyin</th><th>Nghĩa</th><th>HSK</th><th>Kiểm tra</th></tr></thead>
                <tbody>{previewRows.map((row) => (
                  <tr className={row.__duplicate ? 'is-import-duplicate' : ''} key={`${row.__row}-${row.__index}`}>
                    <td className="admin-learning-select-cell"><input checked={selectedRows.has(row.__index)} onChange={() => toggleRow(row.__index)} type="checkbox" /></td>
                    <td><strong>{row.simplified}</strong><small>{row.traditional || '—'}</small></td>
                    <td>{row.pinyin}</td><td>{row.meaningVietnamese}</td><td>{row.hskLevel}</td>
                    <td>{row.__duplicate ? <span className="admin-import-badge is-duplicate">Trùng</span> : <span className="admin-import-badge is-ready">Sẵn sàng</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <AdminPagination onPageChange={setPreviewPage} pagination={{ page: safePreviewPage, pageSize: PREVIEW_PAGE_SIZE, total: reviewedRows.length, totalPages: previewTotalPages }} />
          </section>
        )}

        {error && <p className="admin-import-error" role="alert">{error}</p>}
        <footer className="admin-import-dialog__actions">
          <button className="admin-button admin-button--secondary" disabled={importing} onClick={onClose} type="button">Hủy</button>
          <button className="admin-button admin-button--primary" disabled={importing || !selectedLesson || !rows.length || !eligibleRows.length} onClick={commitImport} type="button">{importing ? 'Đang import…' : `Import ${eligibleRows.length} từ`}</button>
        </footer>
      </section>
    </div>
  );
}
