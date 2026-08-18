import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, test } from "node:test";
import {
  createCvDownloadMetadata,
  fetchCloudinaryCv,
  isCloudinaryUrl,
  normalizeLegacyCvUrl,
  parseLegacyCloudinaryAsset,
  streamCvDownload,
} from "./cvDownload.js";

const openServers = new Set();

afterEach(async () => {
  await Promise.all(
    [...openServers].map(
      (server) =>
        new Promise((resolve) => server.close(() => resolve(undefined))),
    ),
  );
  openServers.clear();
});

test("legacy CV URLs are upgraded to HTTPS and restricted to Cloudinary", () => {
  assert.equal(
    normalizeLegacyCvUrl(
      "http://res.cloudinary.com/example/raw/upload/spg/cv/resume.pdf",
    ),
    "https://res.cloudinary.com/example/raw/upload/spg/cv/resume.pdf",
  );
  assert.equal(normalizeLegacyCvUrl("https://example.com/resume.pdf"), "");
  assert.equal(normalizeLegacyCvUrl("file:///private/resume.pdf"), "");
  assert.equal(
    isCloudinaryUrl("https://cloudinary.com.evil.example/resume.pdf"),
    false,
  );
  assert.equal(
    isCloudinaryUrl("https://untrusted.cloudinary.com/resume.pdf"),
    false,
  );
  assert.equal(
    isCloudinaryUrl("https://api.cloudinary.com/v1_1/example/raw/download"),
    true,
  );
});

test("download metadata preserves a safe original PDF filename", () => {
  const metadata = createCvDownloadMetadata({
    cvName: "Hồ sơ Nguyễn Văn A.pdf",
    cvType: "application/pdf",
  });

  assert.equal(metadata.filename, "Hồ sơ Nguyễn Văn A.pdf");
  assert.equal(metadata.extension, "pdf");
  assert.equal(metadata.contentType, "application/pdf");
  assert.match(
    metadata.contentDisposition,
    /^attachment; filename="[\x20-\x7e]+\.pdf";/,
  );
  assert.match(
    metadata.contentDisposition,
    /filename\*=UTF-8''H%E1%BB%93%20s%C6%A1/,
  );
});

test("legacy Cloudinary asset metadata is parsed with a strict allowlist", () => {
  assert.deepEqual(
    parseLegacyCloudinaryAsset(
      "https://res.cloudinary.com/company-cloud/raw/upload/v123/spg/cv/random-id",
      "company-cloud",
    ),
    {
      format: "",
      publicId: "spg/cv/random-id",
      resourceType: "raw",
      type: "upload",
    },
  );
  assert.deepEqual(
    parseLegacyCloudinaryAsset(
      "https://res.cloudinary.com/company-cloud/image/upload/v123/spg/cv/random-id.pdf",
      "company-cloud",
    ),
    {
      format: "pdf",
      publicId: "spg/cv/random-id",
      resourceType: "image",
      type: "upload",
    },
  );
});

test("legacy asset parsing rejects other clouds, transformations and unsafe IDs", () => {
  const expectedCloud = "company-cloud";

  assert.equal(
    parseLegacyCloudinaryAsset(
      "https://res.cloudinary.com/another-cloud/raw/upload/v123/spg/cv/id",
      expectedCloud,
    ),
    null,
  );
  assert.equal(
    parseLegacyCloudinaryAsset(
      "https://res.cloudinary.com/company-cloud/image/upload/fl_attachment/v123/spg/cv/id.pdf",
      expectedCloud,
    ),
    null,
  );
  assert.equal(
    parseLegacyCloudinaryAsset(
      "https://res.cloudinary.com/company-cloud/raw/upload/v123/spg/%2e%2e/id",
      expectedCloud,
    ),
    null,
  );
  assert.equal(
    parseLegacyCloudinaryAsset(
      "https://res.cloudinary.com/company-cloud/raw/fetch/v123/spg/cv/id",
      expectedCloud,
    ),
    null,
  );
});

test("download metadata guarantees DOC and DOCX extensions", () => {
  const doc = createCvDownloadMetadata({
    cvName: "../../candidate.exe",
    cvType: "application/msword",
  });
  const docx = createCvDownloadMetadata({
    cvFormat: "docx",
    cvName: "candidate",
  });

  assert.equal(doc.filename, "candidate.doc");
  assert.equal(doc.contentType, "application/msword");
  assert.equal(docx.filename, "candidate.docx");
  assert.equal(
    docx.contentType,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
});

test("validated MIME metadata wins over a misleading filename extension", () => {
  const metadata = createCvDownloadMetadata({
    cvName: "candidate.docx",
    cvType: "application/pdf",
  });

  assert.equal(metadata.filename, "candidate.pdf");
  assert.equal(metadata.contentType, "application/pdf");
});

test("Cloudinary redirects cannot escape to another host", async () => {
  const fetchImpl = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://attacker.example/stolen.pdf" },
    });

  await assert.rejects(
    fetchCloudinaryCv(
      "https://res.cloudinary.com/example/raw/upload/resume.pdf",
      { fetchImpl },
    ),
    (error) => error.status === 502,
  );
});

test("CV content is streamed with attachment headers instead of redirecting", async () => {
  const fileBytes = new TextEncoder().encode("%PDF-1.7\nmock CV");
  const fetchImpl = async (url, options) => {
    assert.equal(
      url,
      "https://res.cloudinary.com/example/raw/upload/random-asset",
    );
    assert.equal(options.redirect, "manual");
    return new Response(fileBytes, {
      headers: { "content-type": "application/octet-stream" },
    });
  };
  const server = createServer(async (_req, res) => {
    try {
      await streamCvDownload({
        fetchImpl,
        item: { cvName: "Hồ sơ ứng viên.pdf", cvType: "application/pdf" },
        res,
        sourceUrl: "https://res.cloudinary.com/example/raw/upload/random-asset",
      });
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });
  openServers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/cv`, {
    redirect: "manual",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(
    response.headers.get("content-disposition"),
    /^attachment; filename="[\x20-\x7e]+\.pdf";/,
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), fileBytes);
});
