import { useEffect, useMemo, useState } from 'react';
import {
  bulkDeleteAdminContent,
  deleteAdminContent,
  updateAdminContent,
} from '../../../services/adminService.js';
import { CONTENT_LABELS } from '../constants.js';
import { useAdminContent } from '../hooks/useAdminContent.js';
import { getErrorMessage, getItemId } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';
import AdminPagination from './AdminPagination.jsx';
import ContentImportModal from './ContentImportModal.jsx';
import ContentList from './ContentList.jsx';
import ContentToolbar from './ContentToolbar.jsx';
import { AdminAlert, AdminConfirmDialog } from './AdminFeedback.jsx';

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
  const [confirmDelete, setConfirmDelete] = useState(null);
  const pageIds = useMemo(
    () => content.items.map(getItemId).filter(Boolean),
    [content.items],
  );
  const selectedItems = useMemo(
    () => content.items.filter((item) => selectedIds.includes(getItemId(item))),
    [content.items, selectedIds],
  );
  const selectedDrafts = selectedItems.filter((item) => item.published === false);

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
    setConfirmDelete([item]);
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    setConfirmDelete(selectedItems);
  }

  async function confirmDeletion() {
    if (!confirmDelete?.length || actionId) return;
    const ids = confirmDelete.map(getItemId).filter(Boolean);
    setActionId(ids.length > 1 ? 'bulk' : ids[0]);
    setActionError('');
    try {
      if (ids.length > 1) await bulkDeleteAdminContent(type, ids);
      else await deleteAdminContent(type, ids[0]);
      onNotify(
        ids.length > 1
          ? `Đã xóa ${ids.length} bài viết.`
          : `Đã xóa ${CONTENT_LABELS[type].singular}.`,
      );
      setSelectedIds([]);
      setConfirmDelete(null);
      content.refresh();
    } catch (error) {
      if (onUnauthorized(error)) return;
      setActionError(getErrorMessage(error, 'Không thể xóa nội dung đã chọn.'));
    } finally {
      setActionId('');
    }
  }

  async function handleBulkPublish() {
    if (!selectedDrafts.length || actionId) return;
    setActionId('bulk-publish');
    setActionError('');
    const failures = [];
    let success = 0;
    for (const item of selectedDrafts) {
      try {
        await updateAdminContent(type, getItemId(item), { published: true });
        success += 1;
      } catch (error) {
        if (onUnauthorized(error)) {
          setActionId('');
          return;
        }
        failures.push({ item, message: getErrorMessage(error, 'Không thể xuất bản.') });
      }
    }
    if (success) onNotify(`Đã xuất bản ${success} bài viết.`);
    if (failures.length) {
      onNotify(
        `${failures.length} bài viết chưa thể xuất bản. ${failures[0].item.title}: ${failures[0].message}`,
        'error',
      );
    }
    setSelectedIds(failures.map(({ item }) => getItemId(item)));
    content.refresh();
    setActionId('');
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
          <div className="admin-bulk-bar__actions">
            <button
              className="admin-button admin-button--primary"
              disabled={!selectedDrafts.length || Boolean(actionId)}
              onClick={handleBulkPublish}
              type="button"
            >
              {actionId === 'bulk-publish' ? (
                <span className="admin-spinner" />
              ) : (
                <AdminIcon name="check" size={17} />
              )}
              Xuất bản ({selectedDrafts.length})
            </button>
            <button
              className="admin-button admin-button--danger"
              disabled={Boolean(actionId)}
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
            <button
              className="admin-button admin-button--secondary"
              disabled={Boolean(actionId)}
              onClick={() => setSelectedIds([])}
              type="button"
            >
              Bỏ chọn
            </button>
          </div>
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
      <AdminConfirmDialog
        confirmLabel={
          confirmDelete?.length > 1
            ? `Xóa ${confirmDelete.length} bài viết`
            : 'Xóa bài viết'
        }
        description={
          confirmDelete?.length > 1
            ? 'Các bài viết đã chọn sẽ bị xóa vĩnh viễn cùng tham chiếu hình ảnh không còn dùng trong nội dung đó.'
            : `Bạn sắp xóa “${confirmDelete?.[0]?.title || ''}”. Hành động này không thể hoàn tác.`
        }
        loading={Boolean(actionId)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeletion}
        open={Boolean(confirmDelete?.length)}
        title="Xác nhận xóa bài viết?"
      />
    </section>
  );
}
