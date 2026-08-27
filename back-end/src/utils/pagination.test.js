import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeRegex,
  paginationResult,
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
