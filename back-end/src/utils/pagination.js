const DEFAULT_MAX_PAGE_SIZE = 100;
const DEFAULT_SEARCH_MAX_LENGTH = 160;

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export function parsePagination(
  input = {},
  { defaultPageSize = 10, maxPageSize = DEFAULT_MAX_PAGE_SIZE } = {},
) {
  const page = positiveInteger(input.page, 1);
  const pageSize = Math.min(
    maxPageSize,
    positiveInteger(input.pageSize, defaultPageSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function paginationResult({ page, pageSize }, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseSearch(value, maxLength = DEFAULT_SEARCH_MAX_LENGTH) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, maxLength);
}

export function searchFilter(search, fields) {
  if (!search) return null;
  const escaped = escapeRegex(search);
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    })),
  };
}
