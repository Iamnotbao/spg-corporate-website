import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { persistStudentNotificationThreshold } from "./communications.controller.js";

test("notification bulk thresholds are scoped to the authenticated owner", async () => {
  const owner = new ObjectId();
  const other = new ObjectId();
  const now = new Date("2026-08-27T10:00:00.000Z");
  let call;
  const collection = {
    async updateOne(filter, update, options) { call = { filter, update, options }; },
  };
  await persistStudentNotificationThreshold(
    collection,
    owner,
    { hiddenAllBefore: now, readAllBefore: now },
    now,
  );
  assert.deepEqual(call.filter, { userId: owner });
  assert.notDeepEqual(call.filter, { userId: other });
  assert.equal(call.options.upsert, true);
  assert.equal(call.update.$set.hiddenAllBefore, now);
  assert.equal(call.update.$set.readAllBefore, now);
});
