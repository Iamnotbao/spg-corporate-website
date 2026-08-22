import { getCollection } from "../config/db.js";
import { destroyAsset, uploadFile } from "../utils/cloudinary.js";
import {
  defaultContent,
  fileTitle,
  importFileFormat,
  mapSpreadsheetRows,
  normalizeImportKey,
  parseSpreadsheet,
  summarizeImport,
} from "../utils/contentImport.js";

function buildTitleIndex(items) {
  const index = new Map();
  for (const item of items) {
    const key = normalizeImportKey(item.title);
    if (!key) continue;
    const matches = index.get(key) || [];
    matches.push(item);
    index.set(key, matches);
  }
  return index;
}

function publicItem(item) {
  if (!item) return null;
  return {
    id: String(item._id),
    title: item.title || "",
  };
}

function buildPdfPreview(files, titleIndex) {
  return files.map((file, index) => {
    const title = fileTitle(file);
    const key = normalizeImportKey(title);
    const matches = titleIndex.get(key) || [];

    if (!key) {
      return {
        index,
        filename: file.originalname,
        title,
        action: "error",
        message: "Tên file không thể dùng để liên kết nội dung.",
      };
    }

    if (!matches.length) {
      return {
        index,
        filename: file.originalname,
        title,
        action: "error",
        message: `Không tìm thấy nội dung có tiêu đề “${title}”.`,
      };
    }

    if (matches.length > 1) {
      return {
        index,
        filename: file.originalname,
        title,
        action: "error",
        message: `Có ${matches.length} nội dung trùng tên “${title}”. Hãy đổi tiêu đề để tránh nhầm lẫn.`,
      };
    }

    return {
      index,
      filename: file.originalname,
      title,
      action: "link",
      target: publicItem(matches[0]),
    };
  });
}

function buildSpreadsheetPreview(type, file, titleIndex) {
  const spreadsheetRows = mapSpreadsheetRows(type, parseSpreadsheet(file));

  return spreadsheetRows.map(({ rowNumber, payload, error }) => {
    if (error) {
      return {
        rowNumber,
        title: payload.title || "",
        action: "error",
        message: error,
      };
    }

    const key = normalizeImportKey(payload.title);
    const matches = titleIndex.get(key) || [];
    if (matches.length > 1) {
      return {
        rowNumber,
        title: payload.title,
        payload,
        action: "error",
        message: `Có ${matches.length} nội dung trùng tiêu đề “${payload.title}”.`,
      };
    }

    if (matches.length === 1) {
      return {
        rowNumber,
        title: payload.title,
        payload,
        action: "update",
        target: publicItem(matches[0]),
      };
    }

    return {
      rowNumber,
      title: payload.title,
      payload,
      action: "create",
    };
  });
}

async function applyPdfImport(type, files, rows, collection) {
  const successful = [];
  const failures = [];

  for (const row of rows) {
    if (row.action !== "link") continue;
    const file = files[row.index];
    let uploaded;

    try {
      const folder =
        type === "posts" ? "mandora/blog/documents" : `spg/${type}/documents`;
      uploaded = await uploadFile(file, { folder, resourceType: "raw" });
      const existing = await collection
        .findOne({
          _id: row.target.id,
        })
        .catch(() => null);

      // MongoDB _id is an ObjectId in this project; use the matched title to avoid converting twice.
      const matched =
        existing || (await collection.findOne({ title: row.target.title }));
      if (!matched) throw new Error("Nội dung đích không còn tồn tại.");

      await collection.updateOne(
        { _id: matched._id },
        {
          $set: {
            attachmentUrl: uploaded.secure_url,
            attachmentPublicId: uploaded.public_id,
            attachmentName: file.originalname,
            attachmentMimeType: file.mimetype || "application/pdf",
            attachmentResourceType: uploaded.resource_type || "raw",
            updatedAt: new Date(),
          },
        },
      );

      if (
        matched.attachmentPublicId &&
        matched.attachmentPublicId !== uploaded.public_id
      ) {
        await destroyAsset(
          matched.attachmentPublicId,
          matched.attachmentResourceType || "raw",
        ).catch(() => undefined);
      }

      successful.push({ ...row, url: uploaded.secure_url });
    } catch (error) {
      if (uploaded?.public_id) {
        await destroyAsset(
          uploaded.public_id,
          uploaded.resource_type || "raw",
        ).catch(() => undefined);
      }
      failures.push({ ...row, action: "error", message: error.message });
    }
  }

  return { successful, failures };
}

async function applySpreadsheetImport(type, rows, collection) {
  const successful = [];
  const failures = [];

  for (const row of rows) {
    if (row.action !== "create" && row.action !== "update") continue;

    try {
      if (row.action === "create") {
        const document = {
          ...defaultContent(type),
          ...row.payload,
          createdAt: new Date(),
        };
        const result = await collection.insertOne(document);
        successful.push({
          ...row,
          target: { id: String(result.insertedId), title: document.title },
        });
        continue;
      }

      const matched = await collection.findOne({ title: row.target.title });
      if (!matched) throw new Error("Nội dung cần cập nhật không còn tồn tại.");
      await collection.updateOne(
        { _id: matched._id },
        { $set: { ...row.payload, updatedAt: new Date() } },
      );
      successful.push(row);
    } catch (error) {
      failures.push({ ...row, action: "error", message: error.message });
    }
  }

  return { successful, failures };
}

export async function importContent(type, req, res) {
  if (!new Set(["posts", "jobs"]).has(type)) {
    return res
      .status(400)
      .json({ error: "Loại nội dung import không hợp lệ." });
  }

  const files = req.files || [];
  if (!files.length) {
    return res
      .status(400)
      .json({ error: "Vui lòng chọn file PDF, XLSX hoặc CSV." });
  }

  const format = importFileFormat(files);
  if (format === "mixed") {
    return res.status(400).json({
      error:
        "Mỗi lần import chỉ chọn PDF hoặc một file Excel/CSV, không trộn nhiều loại.",
    });
  }
  if (format === "excel" && files.length !== 1) {
    return res
      .status(400)
      .json({ error: "Mỗi lần chỉ import một file XLSX/CSV." });
  }

  const collection = await getCollection(type);
  const existingItems = await collection
    .find(
      {},
      {
        projection: {
          title: 1,
          attachmentPublicId: 1,
          attachmentResourceType: 1,
        },
      },
    )
    .toArray();
  const titleIndex = buildTitleIndex(existingItems);

  let rows;
  try {
    rows =
      format === "pdf"
        ? buildPdfPreview(files, titleIndex)
        : buildSpreadsheetPreview(type, files[0], titleIndex);
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Không đọc được file import." });
  }

  const preview = {
    format,
    filename:
      files.length === 1 ? files[0].originalname : `${files.length} file PDF`,
    summary: summarizeImport(rows),
    rows,
  };

  const commit = String(req.body?.commit || "").toLowerCase() === "true";
  if (!commit) return res.json({ data: preview });

  const executableRows = rows.filter((row) => row.action !== "error");
  if (!executableRows.length) {
    return res
      .status(400)
      .json({ error: "Không có dòng hợp lệ để import.", data: preview });
  }

  const result =
    format === "pdf"
      ? await applyPdfImport(type, files, rows, collection)
      : await applySpreadsheetImport(type, rows, collection);
  const finalRows = [...result.successful, ...result.failures].sort(
    (a, b) => (a.index ?? a.rowNumber ?? 0) - (b.index ?? b.rowNumber ?? 0),
  );

  return res.json({
    ok: result.failures.length === 0,
    data: {
      ...preview,
      committed: true,
      summary: summarizeImport(finalRows),
      rows: finalRows,
    },
  });
}
