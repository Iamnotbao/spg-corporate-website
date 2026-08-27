import assert from "node:assert/strict";
import test from "node:test";
import * as controller from "./admin.controller.js";

const POST_HANDLERS = [
  "listPosts",
  "getPost",
  "createPost",
  "updatePost",
  "deletePost",
  "bulkDeletePosts",
];

const JOB_HANDLERS = [
  "listJobs",
  "getJob",
  "createJob",
  "updateJob",
  "deleteJob",
  "bulkDeleteJobs",
];

test("admin post routes expose concrete handlers", () => {
  for (const name of POST_HANDLERS) {
    assert.equal(typeof controller[name], "function", `${name} must be a function`);
  }
});

test("admin job routes expose concrete handlers", () => {
  for (const name of JOB_HANDLERS) {
    assert.equal(typeof controller[name], "function", `${name} must be a function`);
  }
});
