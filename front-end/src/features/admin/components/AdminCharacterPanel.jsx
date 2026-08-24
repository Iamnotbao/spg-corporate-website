import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAdminLearning } from '../../../services/adminService.js';
import {
  bulkDeleteAdminCharacters,
  bulkUpdateAdminCharacters,
  createAdminCharacter,
  listAdminCharacters,
  updateAdminCharacter,
} from '../services/adminCharacterService.js';
import { AdminAlert, AdminConfirmDialog } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminCharacterForm from './AdminCharacterForm.jsx';
import AdminCharacterTable from './AdminCharacterTable.jsx';

const PAGE_SIZE = 10;
const HSK_LEVELS = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Ngoài HSK'];
const EMPTY_FORM = {
  id: '',
  simplified: '',
  traditional: '',
  pinyin: '',
  meaningVietnamese: '',
  meaningEnglish: '',
  radical: '',
  strokeCount: '',
  hskLevel: 'HSK 1',
  examplesText: '',
  strokeDataKey: '',
  lessonId: '',
  status: 'draft',
};

function examplesToText(examples = []) {
  return examples
    .map((item) => [item.chinese, item.pinyin, item.meaningVietnamese].join(' | '))
    .join('\n');
}

function textToExamples(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [chinese = '', pinyin = '', meaningVietnamese = ''] = line.split('|');
      return {
        chinese: chinese.trim(),
        pinyin: pinyin.trim(),
        meaningVietnamese: meaningVietnamese.trim(),
      };
    });
}

function payloadFrom(form) {
  return {
    simplified: form.simplified.trim(),
    traditional: form.traditional.trim(),
    pinyin: form.pinyin.trim(),
    meaningVietnamese: form.meaningVietnamese.trim(),
    meaningEnglish: form.meaningEnglish.trim(),
    radical: form.radical.trim(),
    strokeCount: Number(form.strokeCount),
    hskLevel: form.hskLevel,
    examples: textToExamples(form.examplesText),
    strokeDataKey: (form.strokeDataKey || form.simplified).trim(),
    lessonId: form.lessonId,
    status: form.status,
  };
}

export default function AdminCharacterPanel({ onNotify, onUnauthorized }) {
  const [state, setState] = useState({
    status: 'loading',
    items: [],
    pagination: null,
    error: '',
  });
  const [lessons, setLessons] = useState([]);
  const [filters, setFilters] = useState({ search: '', hskLevel: '', status: '' });
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(
    async (signal) => {
      setState((current) => ({ ...current, status: 'loading', error: '' }));
      try {
        const [characters, lessonResponse] = await Promise.all([
          listAdminCharacters({ ...filters, page, pageSize: PAGE_SIZE, signal }),
          listAdminLearning('lessons', { signal }),
        ]);
        if (characters.pagination && page > characters.pagination.totalPages) {
          setPage(characters.pagination.totalPages);
          return;
        }
        setState({
          status: 'ready',
          items: characters.data || [],
          pagination: characters.pagination,
          error: '',
        });
        setLessons(
          (lessonResponse.data || []).filter((lesson) => lesson.type === 'character'),
        );
      } catch (error) {
        if (error.name === 'AbortError') return;
        if (error.status === 401 && onUnauthorized(error)) return;
        setState({ status: 'error', items: [], pagination: null, error: error.message });
      }
    },
    [filters, onUnauthorized, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const lessonNames = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson.title])),
    [lessons],
  );
  const allPageSelected =
    state.items.length > 0 && state.items.every((item) => selectedIds.has(item.id));

  function beginEdit(item) {
    setForm({
      ...EMPTY_FORM,
      ...item,
      strokeCount: String(item.strokeCount),
      lessonId: item.lessonId || '',
      examplesText: examplesToText(item.examples),
    });
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
    setSelectedIds(new Set());
  }

  function submitSearch(event) {
    event.preventDefault();
    updateFilter('search', searchDraft.trim());
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      state.items.forEach((item) => {
        if (allPageSelected) next.delete(item.id);
        else next.add(item.id);
      });
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = payloadFrom(form);
      if (form.id) await updateAdminCharacter(form.id, payload);
      else await createAdminCharacter(payload);
      onNotify(form.id ? 'Đã cập nhật Hán tự.' : 'Đã tạo Hán tự.');
      setForm(null);
      await load();
    } catch (error) {
      if (error.status === 401 && onUnauthorized(error)) return;
      onNotify(error.message || 'Không thể lưu Hán tự.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changeSelectedStatus(status) {
    if (!selectedIds.size || bulkBusy) return;
    setBulkBusy(true);
    try {
      const response = await bulkUpdateAdminCharacters([...selectedIds], status);
      const result = response.data;
      setSelectedIds(new Set((result.failed || []).map((item) => item.id)));
      if (result.succeeded?.length) {
        onNotify(
          `${status === 'published' ? 'Đã xuất bản' : 'Đã ẩn'} ${result.succeeded.length} Hán tự.`,
        );
      }
      if (result.failed?.length) {
        onNotify(
          `${result.failed.length} mục chưa cập nhật được. ${result.failed[0].message}`,
          'error',
        );
      }
      await load();
    } catch (error) {
      if (error.status === 401 && onUnauthorized(error)) return;
      onNotify(error.message || 'Không thể cập nhật hàng loạt.', 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  async function deleteSelected() {
    setBulkBusy(true);
    try {
      const response = await bulkDeleteAdminCharacters([...selectedIds]);
      const result = response.data;
      setSelectedIds(new Set((result.failed || []).map((item) => item.id)));
      if (result.succeeded?.length) onNotify(`Đã xóa ${result.succeeded.length} Hán tự.`);
      if (result.failed?.length) {
        onNotify(
          `${result.failed.length} mục được giữ lại. ${result.failed[0].message}`,
          'error',
        );
      }
      setConfirmDelete(false);
      await load();
    } catch (error) {
      if (error.status === 401 && onUnauthorized(error)) return;
      onNotify(error.message || 'Không thể xóa Hán tự.', 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        action={
          <button
            className="admin-button admin-button--primary"
            onClick={() => setForm({ ...EMPTY_FORM })}
            type="button"
          >
            <AdminIcon name="plus" size={17} /> Tạo Hán tự
          </button>
        }
        description="Quản lý hồ sơ chữ và nguồn nét viết. Liên kết Lesson là tùy chọn và chỉ nhận Lesson loại Hán tự."
        eyebrow="Learning content"
        title="Hán tự"
      />

      {state.error && <AdminAlert onRetry={() => load()}>{state.error}</AdminAlert>}

      <AdminCharacterForm
        form={form}
        hskLevels={HSK_LEVELS}
        lessons={lessons}
        saving={saving}
        setForm={setForm}
        submit={submit}
      />

      <AdminCharacterTable
        allPageSelected={allPageSelected}
        beginEdit={beginEdit}
        bulkBusy={bulkBusy}
        changeSelectedStatus={changeSelectedStatus}
        filters={filters}
        hskLevels={HSK_LEVELS}
        lessonNames={lessonNames}
        searchDraft={searchDraft}
        selectedIds={selectedIds}
        setConfirmDelete={setConfirmDelete}
        setPage={setPage}
        setSearchDraft={setSearchDraft}
        setSelectedIds={setSelectedIds}
        state={state}
        submitSearch={submitSearch}
        togglePage={togglePage}
        toggleSelected={toggleSelected}
        updateFilter={updateFilter}
      />

      <AdminConfirmDialog
        confirmLabel={`Xóa ${selectedIds.size} Hán tự`}
        description="Chỉ bản nháp chưa có lịch sử luyện viết mới được xóa. Các mục không đủ điều kiện sẽ được giữ lại."
        loading={bulkBusy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteSelected}
        open={confirmDelete}
        title="Xác nhận xóa Hán tự?"
      />
    </div>
  );
}
