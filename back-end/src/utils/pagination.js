const DEFAULT_MAX_PAGE_SIZE = 100;
const DEFAULT_SEARCH_MAX_LENGTH = 160;

export const ADMIN_DEFAULT_PAGE_SIZE = 5;
export const ADMIN_PAGE_SIZE_OPTIONS = Object.freeze([5, 10, 20, 50]);

export class QueryValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

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

function parseDate(value, field, { endOfDay = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const parsed = new Date(dateOnly ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new QueryValidationError(`${field} must be a valid date`);
  }
  if (dateOnly && endOfDay) parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed;
}

export function parseDateRange(input = {}, field = "createdAt") {
  const from = parseDate(input.from, "from");
  const to = parseDate(input.to, "to", { endOfDay: true });
  if (from && to && from >= to) {
    throw new QueryValidationError("from must be earlier than to");
  }
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lt: to } : {}),
    },
  };
}

export function parseAdminPagination(input = {}) {
  return parsePagination(input, {
    defaultPageSize: ADMIN_DEFAULT_PAGE_SIZE,
    maxPageSize: Math.max(...ADMIN_PAGE_SIZE_OPTIONS),
  });
}
