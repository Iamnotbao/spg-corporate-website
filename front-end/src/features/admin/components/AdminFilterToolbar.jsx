import AdminIcon from './AdminIcon.jsx';
import { PAGE_SIZE_OPTIONS } from '../constants.js';

export default function AdminFilterToolbar({
  search,
  onSearchChange,
  searchLabel = 'Tìm kiếm',
  searchPlaceholder = 'Tìm kiếm…',
  filters = [],
  from = '',
  to = '',
  onFromChange,
  onToChange,
  pageSize,
  onPageSizeChange,
  children,
}) {
  return (
    <div className="admin-filter-toolbar">
      {onSearchChange && (
        <label className="admin-filter-toolbar__search">
          <AdminIcon name="search" size={17} />
          <span className="admin-sr-only">{searchLabel}</span>
          <input
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={search}
          />
        </label>
      )}
      {filters.map((filter) => (
        <label className="admin-filter-toolbar__control" key={filter.key}>
          <span className="admin-sr-only">{filter.label}</span>
          <select
            aria-label={filter.label}
            onChange={(event) => filter.onChange(event.target.value)}
            value={filter.value}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {onFromChange && (
        <label className="admin-filter-toolbar__date">
          <span>Từ ngày</span>
          <input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
        </label>
      )}
      {onToChange && (
        <label className="admin-filter-toolbar__date">
          <span>Đến ngày</span>
          <input type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
        </label>
      )}
      {onPageSizeChange && (
        <label className="admin-filter-toolbar__control">
          <span className="admin-sr-only">Số mục mỗi trang</span>
          <select
            aria-label="Số mục mỗi trang"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}/trang</option>
            ))}
          </select>
        </label>
      )}
      {children}
    </div>
  );
}
