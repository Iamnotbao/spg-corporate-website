import { useEffect, useMemo, useState } from 'react';
import {
  bulkDeleteAdminContent,
  deleteAdminContent,
} from '../../../services/adminService.js';
import { CONTENT_LABELS } from '../constants.js';
import { useAdminContent } from '../hooks/useAdminContent.js';
import { getErrorMessage, getItemId } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';
import AdminPagination from './AdminPagination.jsx';
import ContentImportModal from './ContentImportModal.jsx';
import ContentList from './ContentList.jsx';
import ContentToolbar from './ContentToolbar.jsx';
import { AdminAlert } from './AdminFeedback.jsx';

export default function ContentWorkspace({
  onCreate,
  onEdit,
  onNotify,
  onUnauthorized,
  onView,
  type,
}) {
  const content = useAdminContent(type, onUnauthorized);
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionId, setActionId] = useState('');
  const [actionError, setActionError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const pageIds = useMemo(
    () => content.items.map(getItemId).filter(Boolean),
    [content.items],
  );

  useEffect(() => {
    setSelectedIds([]);
  }, [pageIds]);

  function toggleSelection(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function togglePage(checked) {
    setSelectedIds(checked ? pageIds : []);
  }

  async function handleDelete(item) {
    const id = getItemId(item);
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa “${item.title || CONTENT_LABELS[type].singular}”?`,
    );
    if (!confirmed) return;

    setActionId(id);
    setActionError('');
    try {
      await deleteAdminContent(type, id);
      onNotify(`Đã xóa ${CONTENT_LABELS[type].singular}.`);
      content.refresh();
    } catch (error) {
      if (onUnauthorized(error)) return;
      setActionError(getErrorMessage(error, 'Không thể xóa nội dung.'));
    } finally {
      setActionId('');
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa ${selectedIds.length} mục đã chọn?`,
    );
    if (!confirmed) return;

    setActionId('bulk');
    setActionError('');
    try {
      await bulkDeleteAdminContent(type, selectedIds);
      onNotify(`Đã xóa ${selectedIds.length} mục.`);
      setSelectedIds([]);
      content.refresh();
    } catch (error) {
      if (onUnauthorized(error)) return;
      setActionError(getErrorMessage(error, 'Không thể xóa các mục đã chọn.'));
    } finally {
      setActionId('');
    }
  }

  function handleImported(result) {
    const successCount =
      (result.summary?.create || 0) +
      (result.summary?.update || 0) +
      (result.summary?.link || 0);
    onNotify(`Import hoàn tất ${successCount} mục.`);
    content.refresh();
  }

  return (
    <section className="admin-panel">
      <ContentToolbar
        filters={content.filters}
        onClear={content.clearFilters}
        onCreate={onCreate}
        onFilterChange={content.updateFilter}
        onImport={() => setImportOpen(true)}
        searchPending={content.searchPending}
        type={type}
      />

      {(content.error || actionError) && (
        <AdminAlert onRetry={content.error ? content.refresh : undefined}>
          {content.error || actionError}
        </AdminAlert>
      )}

      <div className={`admin-bulk-bar${selectedIds.length ? ' is-visible' : ''}`}>
        <span>
          {selectedIds.length
            ? `Đã chọn ${selectedIds.length} mục`
            : `${content.pagination.total.toLocaleString('vi-VN')} mục trong hệ thống`}
        </span>
        {selectedIds.length > 0 && (
          <button
            className="admin-button admin-button--danger"
            disabled={actionId === 'bulk'}
            onClick={handleBulkDelete}
            type="button"
          >
            {actionId === 'bulk' ? (
              <span className="admin-spinner" />
            ) : (
              <AdminIcon name="trash" size={17} />
            )}
            Xóa đã chọn
          </button>
        )}
      </div>

      <ContentList
        actionId={actionId}
        items={content.items}
        loading={content.loading}
        onDelete={handleDelete}
        onEdit={onEdit}
        onSelect={toggleSelection}
        onSelectAll={togglePage}
        onView={onView}
        selectedIds={selectedIds}
        type={type}
      />

      <AdminPagination onPageChange={content.setPage} pagination={content.pagination} />

      {importOpen && (
        <ContentImportModal
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
          onUnauthorized={onUnauthorized}
          type={type}
        />
      )}
    </section>
  );
}
