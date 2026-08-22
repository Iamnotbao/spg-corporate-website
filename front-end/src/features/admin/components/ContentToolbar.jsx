import {
  CONTENT_LABELS,
  JOB_TYPES,
  NEWS_CATEGORIES,
  PAGE_SIZE_OPTIONS,
} from '../constants.js';
import AdminIcon from './AdminIcon.jsx';

export default function ContentToolbar({
  filters,
  onClear,
  onCreate,
  onFilterChange,
  onImport,
  searchPending,
  type,
}) {
  const hasFilters = Boolean(
    filters.search || filters.published || filters.jobType || filters.location,
  );

  return (
    <>
      <div className="admin-panel__heading">
        <div>
          <h2>{CONTENT_LABELS[type].plural}</h2>
          <p>{CONTENT_LABELS[type].description}</p>
        </div>
        <div className="admin-panel__heading-actions">
          <button
            className="admin-button admin-button--secondary"
            onClick={onImport}
            type="button"
          >
            <AdminIcon name="download" size={18} />
            Import PDF / Excel
          </button>
          <button
            className="admin-button admin-button--primary"
            onClick={onCreate}
            type="button"
          >
            <AdminIcon name="plus" size={18} />
            Tạo mới
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-field">
          <label className="admin-sr-only" htmlFor={`admin-search-${type}`}>
            Tìm kiếm {CONTENT_LABELS[type].singular}
          </label>
          <AdminIcon name="search" size={19} />
          <input
            id={`admin-search-${type}`}
            onChange={(event) => onFilterChange('search', event.target.value)}
            placeholder="Tìm theo tiêu đề hoặc mô tả…"
            type="search"
            value={filters.search}
          />
          {searchPending && (
            <span className="admin-search-field__pending" title="Đang tìm kiếm">
              <span className="admin-spinner" />
            </span>
          )}
          {filters.search && !searchPending && (
            <button
              aria-label="Xóa nội dung tìm kiếm"
              onClick={() => onFilterChange('search', '')}
              type="button"
            >
              <AdminIcon name="close" size={16} />
            </button>
          )}
        </div>

        <label className="admin-filter-field">
          <span>Trạng thái</span>
          <select
            onChange={(event) => onFilterChange('published', event.target.value)}
            value={filters.published}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hiển thị</option>
            <option value="false">Đang ẩn</option>
          </select>
        </label>

        {type === 'posts' && (
          <label className="admin-filter-field">
            <span>Chuyên mục</span>
            <select
              onChange={(event) => onFilterChange('category', event.target.value)}
              value={filters.category}
            >
              {NEWS_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {type === 'jobs' && (
          <>
            <label className="admin-filter-field">
              <span>Loại công việc</span>
              <select
                onChange={(event) => onFilterChange('jobType', event.target.value)}
                value={filters.jobType}
              >
                <option value="">Tất cả loại</option>
                {JOB_TYPES.map((jobType) => (
                  <option key={jobType} value={jobType}>
                    {jobType}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-filter-field">
              <span>Địa điểm</span>
              <input
                onChange={(event) => onFilterChange('location', event.target.value)}
                placeholder="Ví dụ: Bình Dương"
                type="text"
                value={filters.location}
              />
            </label>
          </>
        )}

        <label className="admin-filter-field admin-filter-field--compact">
          <span>Số dòng</span>
          <select
            onChange={(event) => onFilterChange('pageSize', Number(event.target.value))}
            value={filters.pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} dòng
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button className="admin-clear-filters" onClick={onClear} type="button">
            Đặt lại
          </button>
        )}
      </div>
    </>
  );
}
