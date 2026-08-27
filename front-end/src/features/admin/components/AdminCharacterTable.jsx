import { AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPagination from './AdminPagination.jsx';

export default function AdminCharacterTable({
  allPageSelected,
  beginEdit,
  bulkBusy,
  changeSelectedStatus,
  filters,
  hskLevels,
  lessonNames,
  pageSizeOptions,
  searchDraft,
  selectedIds,
  setConfirmDelete,
  setPage,
  setPageSize,
  setSearchDraft,
  setSelectedIds,
  state,
  submitSearch,
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
      <form className="admin-learning-toolbar" onSubmit={submitSearch}>
        <label>
          <AdminIcon name="search" size={18} />
          <span className="admin-sr-only">Tìm Hán tự</span>
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Tìm chữ, Pinyin, nghĩa hoặc bộ thủ…"
          />
        </label>
        <select
          aria-label="Lọc theo HSK"
          value={filters.hskLevel}
          onChange={(event) => updateFilter('hskLevel', event.target.value)}
        >
          <option value="">Tất cả HSK</option>
          {hskLevels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <select
          aria-label="Lọc theo trạng thái"
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="published">Đã xuất bản</option>
        </select>
        <button className="admin-button admin-button--secondary" type="submit">
          Tìm
        </button>
        <select
          aria-label="Số Hán tự mỗi trang"
          onChange={(event) => setPageSize(Number(event.target.value))}
          value={state.pagination?.pageSize || pageSizeOptions[1]}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}/trang
            </option>
          ))}
        </select>
      </form>

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
