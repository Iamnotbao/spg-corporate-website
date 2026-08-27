import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  createChatRepository,
  decodeMessageCursor,
} from "./chat.repository.js";

function message(hex, createdAt) {
  return { _id: new ObjectId(hex), sessionId: "session-1", createdAt: new Date(createdAt) };
}

function pageProvider(rows, capture) {
  return async () => ({
    find(filter) {
      capture.filter = filter;
      return {
        sort(value) {
          capture.sort = value;
          return this;
        },
        limit(value) {
          capture.limit = value;
          return this;
        },
        async toArray() {
          return rows;
        },
      };
    },
  });
}

test("realtime message lookup is scoped to its conversation", async () => {
  const capture = {};
  const expected = message("507f1f77bcf86cd799439014", "2026-08-26T10:04:00Z");
  const repository = createChatRepository(async () => ({
    async findOne(filter) {
      capture.filter = filter;
      return expected;
    },
  }));

  const result = await repository.findMessage("session-1", String(expected._id));
  assert.equal(result, expected);
  assert.deepEqual(capture.filter, {
    _id: expected._id,
    sessionId: "session-1",
  });
  assert.equal(await repository.findMessage("session-1", "invalid"), null);
});

test("chat message cursor returns the latest page in chronological display order", async () => {
  const rows = [
    message("507f1f77bcf86cd799439014", "2026-08-26T10:04:00Z"),
    message("507f1f77bcf86cd799439013", "2026-08-26T10:03:00Z"),
    message("507f1f77bcf86cd799439012", "2026-08-26T10:02:00Z"),
    message("507f1f77bcf86cd799439011", "2026-08-26T10:01:00Z"),
  ];
  const capture = {};
  const repository = createChatRepository(pageProvider(rows, capture));
  const result = await repository.listMessages("session-1", { limit: 3 });

  assert.deepEqual(result.items.map((item) => String(item._id)), [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014",
  ]);
  assert.deepEqual(capture.sort, { createdAt: -1, _id: -1 });
  assert.equal(capture.limit, 4);
  assert.equal(result.pagination.hasMore, true);
  assert.equal(String(decodeMessageCursor(result.pagination.nextCursor).id), rows[2]._id.toString());
});

test("older chat cursor uses timestamp and id tie-breaker without overlapping the latest page", async () => {
  const boundary = message("507f1f77bcf86cd799439012", "2026-08-26T10:02:00Z");
  const latestCapture = {};
  const latest = await createChatRepository(
    pageProvider(
      [
        message("507f1f77bcf86cd799439014", "2026-08-26T10:04:00Z"),
        message("507f1f77bcf86cd799439013", "2026-08-26T10:03:00Z"),
        boundary,
      ],
      latestCapture,
    ),
  ).listMessages("session-1", { limit: 2 });

  const olderCapture = {};
  const older = await createChatRepository(
    pageProvider(
      [message("507f1f77bcf86cd799439011", "2026-08-26T10:01:00Z")],
      olderCapture,
    ),
  ).listMessages("session-1", { limit: 2, before: latest.pagination.nextCursor });

  const cursorBoundary = latest.items[0];
  assert.equal(
    olderCapture.filter.$or[0].createdAt.$lt.toISOString(),
    cursorBoundary.createdAt.toISOString(),
  );
  assert.equal(String(olderCapture.filter.$or[1]._id.$lt), String(cursorBoundary._id));
  assert.equal(
    older.items.some((item) => latest.items.some((recent) => String(recent._id) === String(item._id))),
    false,
  );
});

test("chat deletion removes messages before deleting the session", async () => {
  const calls = [];
  const repository = createChatRepository(async (name) => ({
    async deleteMany(filter) {
      calls.push([name, "deleteMany", filter]);
      return { deletedCount: 4 };
    },
    async deleteOne(filter) {
      calls.push([name, "deleteOne", filter]);
      return { deletedCount: 1 };
    },
  }));
  const result = await repository.deleteConversation("session-1");
  assert.deepEqual(calls, [
    ["chat_messages", "deleteMany", { sessionId: "session-1" }],
    ["chat_sessions", "deleteOne", { sessionId: "session-1" }],
  ]);
  assert.deepEqual(result, { deletedMessages: 4, deletedSession: 1 });
});
