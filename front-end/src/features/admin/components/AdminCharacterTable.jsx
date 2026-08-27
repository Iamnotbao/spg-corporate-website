import { AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';

export default function AdminCharacterTable({
  allPageSelected,
  beginEdit,
  bulkBusy,
  changeSelectedStatus,
  filters,
  hskLevels,
  lessonNames,
  searchDraft,
  selectedIds,
  setConfirmDelete,
  setPage,
  setPageSize,
  setSearchDraft,
  setSelectedIds,
  state,
  togglePage,
  toggleSelected,
  updateFilter,
}) {
  const selectedDraftCount = state.items.filter(
    (item) => selectedIds.has(item.id) && item.status !== 'published',
  ).length;
  const selectedPublishedCount = state.items.filter(
    (item) => selectedIds.has(item.id) && item.status === 'published',
  ).length;

  return (
    <section className="admin-panel admin-learning-list">
      <AdminFilterToolbar search={searchDraft} onSearchChange={setSearchDraft} searchPlaceholder="Tìm chữ, Pinyin, nghĩa hoặc bộ thủ…" filters={[{ key: 'hsk', label: 'Cấp HSK', value: filters.hskLevel, onChange: (value) => updateFilter('hskLevel', value), options: [{ value: '', label: 'Tất cả HSK' }, ...hskLevels.map((value) => ({ value, label: value }))] }, { key: 'status', label: 'Trạng thái', value: filters.status, onChange: (value) => updateFilter('status', value), options: [{ value: '', label: 'Tất cả trạng thái' }, { value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã xuất bản' }] }]} from={filters.from} to={filters.to} onFromChange={(value) => updateFilter('from', value)} onToChange={(value) => updateFilter('to', value)} pageSize={state.pagination?.pageSize || 5} onPageSizeChange={setPageSize} />

      {selectedIds.size > 0 && (
        <div className="admin-learning-selection-bar">
          <div>
            <strong>{selectedIds.size} Hán tự đã chọn</strong>
            <span>Backend vẫn kiểm tra dữ liệu nét và vòng đời từng mục.</span>
          </div>
          <div>
            <button
              className="admin-button admin-button--primary"
              disabled={!selectedDraftCount || bulkBusy}
              onClick={() => changeSelectedStatus('published')}
              type="button"
            >
              Xuất bản đã chọn ({selectedDraftCount})
            </button>
            <button
              className="admin-button admin-button--secondary"
              disabled={!selectedPublishedCount || bulkBusy}
              onClick={() => changeSelectedStatus('draft')}
              type="button"
            >
              Gỡ xuất bản đã chọn ({selectedPublishedCount})
            </button>
            <button
              className="admin-button admin-button--danger"
              disabled={bulkBusy}
              onClick={() => setConfirmDelete(true)}
              type="button"
            >
              Xóa
            </button>
            <button
              className="admin-button admin-button--secondary"
              disabled={bulkBusy}
              onClick={() => setSelectedIds(new Set())}
              type="button"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {state.status === 'loading' ? (
        <AdminSkeletonRows count={6} />
      ) : state.items.length ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table admin-learning-table">
              <thead>
                <tr>
                  <th className="admin-learning-select-cell">
                    <input
                      aria-label="Chọn trang hiện tại"
                      checked={allPageSelected}
                      onChange={togglePage}
                      type="checkbox"
                    />
                  </th>
                  <th>Chữ</th>
                  <th>Nghĩa</th>
                  <th>Bộ / nét</th>
                  <th>HSK</th>
                  <th>Lesson</th>
                  <th>Trạng thái</th>
                  <th className="admin-table__actions-heading">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item) => (
                  <tr
                    className={selectedIds.has(item.id) ? 'is-selected' : ''}
                    key={item.id}
                  >
                    <td className="admin-learning-select-cell">
                      <input
                        aria-label={`Chọn ${item.simplified}`}
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <strong className="admin-character-glyph" lang="zh-Hans">
                        {item.simplified}
                      </strong>
                      <small>
                        {item.traditional || '—'} · {item.pinyin}
                      </small>
                    </td>
                    <td>
                      {item.meaningVietnamese}
                      <small>{item.meaningEnglish || '—'}</small>
                    </td>
                    <td>
                      {item.radical} · {item.strokeCount}
                    </td>
                    <td>{item.hskLevel}</td>
                    <td>{lessonNames.get(item.lessonId) || 'Không liên kết'}</td>
                    <td>
                      <span className={`admin-learning-badge is-${item.status}`}>
                        {item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                      </span>
                    </td>
                    <td className="admin-learning-actions">
                      <button
                        className="admin-button admin-button--secondary"
                        onClick={() => beginEdit(item)}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="admin-button admin-button--danger"
                        disabled={item.status === 'published'}
                        onClick={() => {
                          setSelectedIds(new Set([item.id]));
                          setConfirmDelete(true);
                        }}
                        title={
                          item.status === 'published'
                            ? 'Ẩn Hán tự trước khi xóa'
                            : undefined
                        }
                        type="button"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.pagination && (
            <AdminPagination onPageChange={setPage} pagination={state.pagination} />
          )}
        </>
      ) : (
        <AdminEmpty title="Chưa có Hán tự phù hợp">
          Tạo Hán tự mới hoặc thử bộ lọc khác.
        </AdminEmpty>
      )}
    </section>
  );
}
