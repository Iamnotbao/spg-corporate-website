import { inflateRawSync } from "node:zlib";

const MAX_XLSX_XML_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const XML_PREFIX = "(?:[\\w.-]+:)?";

const FIELD_ALIASES = {
  title: ["title", "tieu de", "ten", "ten bai viet", "vi tri", "ten vi tri", "position"],
  summary: ["summary", "tom tat", "mo ta ngan", "excerpt"],
  content: ["content", "noi dung", "noi dung bai viet"],
  description: ["description", "mo ta", "mo ta cong viec", "job description"],
  location: ["location", "dia diem", "noi lam viec"],
  type: ["type", "loai", "loai cong viec", "job type"],
  salary: ["salary", "muc luong", "luong"],
  benefits: ["benefits", "quyen loi", "phuc loi"],
  workingHours: ["working hours", "workinghours", "thoi gian lam viec", "gio lam viec"],
  imageUrl: ["image url", "imageurl", "anh", "anh dai dien", "url anh"],
  published: ["published", "hien thi", "xuat ban", "trang thai"],
};

const ALLOWED_FIELDS = {
  posts: new Set(["title", "summary", "content", "imageUrl", "published"]),
  jobs: new Set([
    "title",
    "summary",
    "description",
    "location",
    "type",
    "salary",
    "benefits",
    "workingHours",
    "imageUrl",
    "published",
  ]),
};

const DEFAULT_CONTENT = {
  posts: {
    title: "",
    summary: "",
    content: "",
    imageUrl: "",
    imagePublicId: "",
    published: true,
  },
  jobs: {
    title: "",
    summary: "",
    description: "",
    location: "",
    type: "Full-time",
    salary: "",
    benefits: "",
    workingHours: "",
    imageUrl: "",
    imagePublicId: "",
    published: true,
  },
};

export function normalizeImportKey(value) {
  return String(value || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

export function fileTitle(file) {
  return String(file?.originalname || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .trim();
}

export function importFileFormat(files = []) {
  if (!files.length) return "";
  const kinds = new Set(
    files.map((file) => {
      const name = String(file.originalname || "").toLowerCase();
      if (file.mimetype === "application/pdf" || name.endsWith(".pdf")) return "pdf";
      if (
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        name.endsWith(".xlsx") ||
        file.mimetype === "text/csv" ||
        file.mimetype === "application/csv" ||
        name.endsWith(".csv")
      ) {
        return "excel";
      }
      return "unknown";
    }),
  );

  if (kinds.size !== 1 || kinds.has("unknown")) return "mixed";
  return [...kinds][0];
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function xmlAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name.replace(":", "\\:")}=["']([^"']*)["']`, "i"))?.[1] || "";
}

function findZipEntries(buffer) {
  let eocd = -1;
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("Không đọc được cấu trúc file XLSX.");

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("File XLSX có cấu trúc ZIP không hợp lệ.");
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    entries.set(name.replace(/^\//, ""), {
      method,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer, entries, requestedName) {
  const name = requestedName.replace(/^\//, "");
  const entry = entries.get(name);
  if (!entry) return null;
  if (entry.uncompressedSize > MAX_XLSX_XML_BYTES) {
    throw new Error(`Nội dung ${name} trong XLSX quá lớn.`);
  }

  const localOffset = entry.localOffset;
  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error("File XLSX có local header không hợp lệ.");
  }
  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  let output;
  if (entry.method === 0) output = compressed;
  else if (entry.method === 8) output = inflateRawSync(compressed);
  else throw new Error("XLSX sử dụng kiểu nén chưa được hỗ trợ.");

  if (output.length > MAX_XLSX_XML_BYTES) {
    throw new Error(`Nội dung ${name} trong XLSX quá lớn.`);
  }
  return output.toString("utf8");
}

function resolveFirstWorksheet(buffer, entries) {
  const workbook = readZipEntry(buffer, entries, "xl/workbook.xml");
  const rels = readZipEntry(buffer, entries, "xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) return "xl/worksheets/sheet1.xml";

  const sheetTag = workbook.match(
    new RegExp(`<${XML_PREFIX}sheet\\b[^>]*\\br:id=["'][^"']+["'][^>]*>`, "i"),
  )?.[0];
  const relationId = sheetTag ? xmlAttribute(sheetTag, "r:id") : "";
  if (!relationId) return "xl/worksheets/sheet1.xml";

  const relationships =
    rels.match(new RegExp(`<${XML_PREFIX}Relationship\\b[^>]*>`, "gi")) || [];
  const relation = relationships.find((tag) => xmlAttribute(tag, "Id") === relationId);
  const target = relation ? xmlAttribute(relation, "Target") : "";
  if (!target) return "xl/worksheets/sheet1.xml";
  if (target.startsWith("/")) return target.replace(/^\//, "");
  return target.startsWith("xl/") ? target : `xl/${target.replace(/^\.\//, "")}`;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const itemPattern = new RegExp(
    `<${XML_PREFIX}si\\b[^>]*>([\\s\\S]*?)<\\/${XML_PREFIX}si>`,
    "gi",
  );
  const textPattern = new RegExp(
    `<${XML_PREFIX}t\\b[^>]*>([\\s\\S]*?)<\\/${XML_PREFIX}t>`,
    "gi",
  );

  return [...xml.matchAll(itemPattern)].map((match) => {
    const texts = [...match[1].matchAll(textPattern)];
    return decodeXml(texts.map((item) => item[1]).join(""));
  });
}

function columnIndexFromReference(reference) {
  const letters = String(reference || "").match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, value - 1);
}

function cellValue(cellTag, body, sharedStrings) {
  const type = xmlAttribute(cellTag, "t");
  if (type === "inlineStr") {
    const textPattern = new RegExp(
      `<${XML_PREFIX}t\\b[^>]*>([\\s\\S]*?)<\\/${XML_PREFIX}t>`,
      "gi",
    );
    const texts = [...body.matchAll(textPattern)];
    return decodeXml(texts.map((item) => item[1]).join(""));
  }

  const valuePattern = new RegExp(
    `<${XML_PREFIX}v\\b[^>]*>([\\s\\S]*?)<\\/${XML_PREFIX}v>`,
    "i",
  );
  const raw = body.match(valuePattern)?.[1] ?? "";
  const value = decodeXml(raw);
  if (type === "s") return sharedStrings[Number(value)] ?? "";
  if (type === "b") return value === "1";
  return value;
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = [];
  const rowPattern = new RegExp(
    `<${XML_PREFIX}row\\b[^>]*>([\\s\\S]*?)<\\/${XML_PREFIX}row>`,
    "gi",
  );
  const cellPattern = new RegExp(
    `(<${XML_PREFIX}c\\b[^>]*>)([\\s\\S]*?)<\\/${XML_PREFIX}c>`,
    "gi",
  );

  for (const rowMatch of xml.matchAll(rowPattern)) {
    const values = [];
    for (const cellMatch of rowMatch[1].matchAll(cellPattern)) {
      const reference = xmlAttribute(cellMatch[1], "r");
      values[columnIndexFromReference(reference)] = cellValue(
        cellMatch[1],
        cellMatch[2],
        sharedStrings,
      );
    }
    rows.push(values);
    if (rows.length > MAX_IMPORT_ROWS + 1) {
      throw new Error(`Excel chỉ hỗ trợ tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần import.`);
    }
  }
  return rows;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
      if (rows.length > MAX_IMPORT_ROWS + 1) {
        throw new Error(`Excel/CSV chỉ hỗ trợ tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần import.`);
      }
    } else value += char;
  }

  row.push(value.replace(/\r$/, ""));
  if (row.some((cell) => String(cell).trim())) rows.push(row);
  return rows;
}

function rowsToObjects(rows) {
  const usableRows = rows.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  if (!usableRows.length) return [];
  const headers = usableRows[0].map((cell) => String(cell ?? "").trim());
  return usableRows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    values: Object.fromEntries(headers.map((header, column) => [header, row[column] ?? ""])),
  }));
}

export function parseSpreadsheet(file) {
  const name = String(file?.originalname || "").toLowerCase();
  if (name.endsWith(".csv") || /csv/i.test(file?.mimetype || "")) {
    return rowsToObjects(parseCsv(file.buffer.toString("utf8").replace(/^\uFEFF/, "")));
  }

  const entries = findZipEntries(file.buffer);
  const sharedStrings = parseSharedStrings(
    readZipEntry(file.buffer, entries, "xl/sharedStrings.xml"),
  );
  const sheetPath = resolveFirstWorksheet(file.buffer, entries);
  const sheetXml = readZipEntry(file.buffer, entries, sheetPath);
  if (!sheetXml) throw new Error("Không tìm thấy sheet đầu tiên trong file XLSX.");
  return rowsToObjects(parseWorksheetRows(sheetXml, sharedStrings));
}

function normalizeHeader(value) {
  return normalizeImportKey(value).replace(/-/g, " ");
}

const ALIAS_LOOKUP = new Map(
  Object.entries(FIELD_ALIASES).flatMap(([field, aliases]) =>
    aliases.map((alias) => [normalizeHeader(alias), field]),
  ),
);

function parsePublished(value) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeHeader(value);
  if (["true", "1", "yes", "y", "co", "hien thi", "xuat ban", "published"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "khong", "an", "draft", "hidden"].includes(normalized)) {
    return false;
  }
  throw new Error(`Giá trị trạng thái “${value}” không hợp lệ.`);
}

export function mapSpreadsheetRows(type, rows) {
  const allowed = ALLOWED_FIELDS[type];
  if (!allowed) throw new Error("Loại nội dung import không hợp lệ.");

  return rows.map(({ rowNumber, values }) => {
    const payload = {};
    try {
      for (const [header, rawValue] of Object.entries(values)) {
        const field = ALIAS_LOOKUP.get(normalizeHeader(header));
        if (!field || !allowed.has(field)) continue;
        const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
        if (value === "" || value == null) continue;
        payload[field] = field === "published" ? parsePublished(value) : String(value).trim();
      }

      if (!payload.title) throw new Error("Thiếu cột title/tiêu đề/vị trí.");
      return { rowNumber, payload };
    } catch (error) {
      return { rowNumber, payload, error: error.message };
    }
  });
}

export function defaultContent(type) {
  return { ...(DEFAULT_CONTENT[type] || {}) };
}

export function summarizeImport(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.total += 1;
      if (row.action === "create") summary.create += 1;
      else if (row.action === "update") summary.update += 1;
      else if (row.action === "link") summary.link += 1;
      else summary.error += 1;
      return summary;
    },
    { total: 0, create: 0, update: 0, link: 0, error: 0 },
  );
}
