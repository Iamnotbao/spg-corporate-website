import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeRegex,
  ADMIN_DEFAULT_PAGE_SIZE,
  paginationResult,
  parseAdminPagination,
  parseDateRange,
  parsePagination,
  parseSearch,
} from "./pagination.js";

test("parsePagination calculates page offsets and clamps page size", () => {
  assert.deepEqual(parsePagination({ page: "2", pageSize: "25" }), {
    page: 2,
    pageSize: 25,
    skip: 25,
  });
  assert.deepEqual(parsePagination({ page: "0", pageSize: "1000" }), {
    page: 1,
    pageSize: 100,
    skip: 0,
  });
});

test("admin pagination defaults to five rows", () => {
  assert.equal(ADMIN_DEFAULT_PAGE_SIZE, 5);
  assert.deepEqual(parseAdminPagination({}), {
    page: 1,
    pageSize: 5,
    skip: 0,
  });
});

test("date ranges use inclusive start and exclusive next-day end", () => {
  assert.deepEqual(parseDateRange({ from: "2026-08-01", to: "2026-08-02" }), {
    createdAt: {
      $gte: new Date("2026-08-01T00:00:00.000Z"),
      $lt: new Date("2026-08-03T00:00:00.000Z"),
    },
  });
  assert.throws(() => parseDateRange({ from: "not-a-date" }), /valid date/);
  assert.throws(
    () => parseDateRange({ from: "2026-08-03", to: "2026-08-02" }),
    /earlier than/,
  );
});

test("paginationResult reports totals including an empty result", () => {
  assert.deepEqual(paginationResult({ page: 2, pageSize: 10 }, 23), {
    page: 2,
    pageSize: 10,
    total: 23,
    totalPages: 3,
  });
  assert.equal(paginationResult({ page: 1, pageSize: 10 }, 0).totalPages, 1);
});

test("search helpers cap input and escape regex syntax", () => {
  assert.equal(parseSearch(`  ${"x".repeat(200)}  `).length, 160);
  assert.equal(escapeRegex("HSK (1)+"), "HSK \\(1\\)\\+");
});
