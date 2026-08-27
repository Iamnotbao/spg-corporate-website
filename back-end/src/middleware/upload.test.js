import assert from "node:assert/strict";
import test from "node:test";
import { validateVideoSignature } from "./upload.js";

function validate(file) {
  return new Promise((resolve) => {
    validateVideoSignature({ file }, {}, (error) => resolve(error || null));
  });
}

test("video signatures accept ISO media and reject mismatched content", async () => {
  const mp4 = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  assert.equal(await validate({ mimetype: "video/mp4", buffer: mp4 }), null);
  const error = await validate({ mimetype: "video/mp4", buffer: Buffer.from("not a video") });
  assert.equal(error.status, 415);
  assert.equal(error.code, "INVALID_VIDEO_SIGNATURE");
});
