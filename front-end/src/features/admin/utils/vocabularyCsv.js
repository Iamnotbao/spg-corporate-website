export const VOCABULARY_CSV_HEADERS = [
  'simplified',
  'traditional',
  'pinyin',
  'meaningVietnamese',
  'meaningEnglish',
  'hskLevel',
  'lessonId',
  'status',
  'audioUrl',
  'exampleChinese',
  'examplePinyin',
  'exampleVietnamese',
];

export const VOCABULARY_IMPORT_HEADERS = [
  'simplified',
  'traditional',
  'pinyin',
  'meaningVietnamese',
  'meaningEnglish',
  'hskLevel',
  'audioUrl',
  'exampleChinese',
  'examplePinyin',
  'exampleVietnamese',
];

const REQUIRED_IMPORT_HEADERS = [
  'simplified',
  'pinyin',
  'meaningVietnamese',
  'hskLevel',
];

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function quoteCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(headers, items = []) {
  const rows = items.map((item) =>
    headers.map((header) => quoteCsv(item?.[header])).join(','),
  );
  return `\uFEFF${headers.join(',')}\r\n${rows.join('\r\n')}`;
}

function recordsFromRows(rows, sourceLabel) {
  const populated = rows.filter((row) =>
    row.some((value) => String(value ?? '').trim()),
  );
  if (!populated.length) return [];

  const headers = populated.shift().map((header) => String(header ?? '').trim());
  const missing = REQUIRED_IMPORT_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw new Error(`${sourceLabel} thiếu cột bắt buộc: ${missing.join(', ')}`);
  }

  return populated.map((values, rowIndex) => {
    const record = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    );
    record.__row = rowIndex + 2;
    return record;
  });
}

function columnIndex(reference = '') {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase() || '';
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, result - 1);
}

function parseXml(text, label) {
  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error(`Không thể đọc ${label} trong file Excel.`);
  }
  return document;
}

function normalizeZipPath(baseDirectory, target) {
  const parts = `${baseDirectory}/${String(target || '').replace(/^\//, '')}`.split('/');
  const normalized = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') normalized.pop();
    else normalized.push(part);
  }
  return normalized.join('/');
}

function findZipEntries(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  const minimumOffset = Math.max(0, bytes.length - 65_557);
  let eocdOffset = -1;

  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_EOCD_SIGNATURE) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('File Excel không có cấu trúc ZIP hợp lệ.');

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_SIGNATURE) {
      throw new Error('Không thể đọc danh mục file bên trong Excel.');
    }
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + fileNameLength));
    entries.set(name, { compressionMethod, compressedSize, localHeaderOffset });
    offset = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

async function unzipEntry(buffer, entry) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const offset = entry.localHeaderOffset;
  if (view.getUint32(offset, true) !== ZIP_LOCAL_SIGNATURE) {
    throw new Error('File Excel có entry không hợp lệ.');
  }

  const fileNameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const start = offset + 30 + fileNameLength + extraLength;
  const compressed = bytes.slice(start, start + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod !== 8) {
    throw new Error(`Excel dùng kiểu nén chưa được hỗ trợ (${entry.compressionMethod}).`);
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt này chưa hỗ trợ đọc Excel trực tiếp. Hãy dùng Chrome/Edge mới hoặc CSV.');
  }

  const stream = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipText(buffer, entries, path, optional = false) {
  const entry = entries.get(path);
  if (!entry) {
    if (optional) return '';
    throw new Error(`File Excel thiếu ${path}.`);
  }
  const bytes = await unzipEntry(buffer, entry);
  return new TextDecoder('utf-8').decode(bytes);
}

async function parseXlsx(file) {
  const buffer = await file.arrayBuffer();
  const entries = findZipEntries(buffer);
  const workbookXml = await readZipText(buffer, entries, 'xl/workbook.xml');
  const relationshipsXml = await readZipText(
    buffer,
    entries,
    'xl/_rels/workbook.xml.rels',
  );
  const workbook = parseXml(workbookXml, 'workbook.xml');
  const relationships = parseXml(relationshipsXml, 'workbook relationships');
  const firstSheet = workbook.getElementsByTagName('sheet')[0];
  if (!firstSheet) throw new Error('File Excel không có worksheet để import.');

  const relationshipId =
    firstSheet.getAttributeNS(RELATIONSHIP_NAMESPACE, 'id') ||
    firstSheet.getAttribute('r:id');
  const relationship = Array.from(
    relationships.getElementsByTagName('Relationship'),
  ).find((item) => item.getAttribute('Id') === relationshipId);
  if (!relationship) throw new Error('Không xác định được worksheet đầu tiên trong Excel.');

  const sheetPath = normalizeZipPath('xl', relationship.getAttribute('Target'));
  const sheetXml = await readZipText(buffer, entries, sheetPath);
  const sharedStringsXml = await readZipText(
    buffer,
    entries,
    'xl/sharedStrings.xml',
    true,
  );
  const sharedStrings = [];

  if (sharedStringsXml) {
    const sharedDocument = parseXml(sharedStringsXml, 'sharedStrings.xml');
    for (const item of sharedDocument.getElementsByTagName('si')) {
      sharedStrings.push(
        Array.from(item.getElementsByTagName('t'))
          .map((node) => node.textContent || '')
          .join(''),
      );
    }
  }

  const worksheet = parseXml(sheetXml, 'worksheet');
  const rows = [];
  for (const rowNode of worksheet.getElementsByTagName('row')) {
    const values = [];
    for (const cell of rowNode.getElementsByTagName('c')) {
      const index = columnIndex(cell.getAttribute('r'));
      const type = cell.getAttribute('t');
      let value;

      if (type === 'inlineStr') {
        value = Array.from(cell.getElementsByTagName('t'))
          .map((node) => node.textContent || '')
          .join('');
      } else {
        const raw = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        if (type === 's') value = sharedStrings[Number(raw)] ?? '';
        else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
        else value = raw;
      }
      values[index] = value ?? '';
    }
    rows.push(values.map((value) => value ?? ''));
  }

  return recordsFromRows(rows, 'Excel');
}

export function vocabularyToCsv(items = []) {
  return rowsToCsv(VOCABULARY_CSV_HEADERS, items);
}

export function vocabularyTemplateCsv() {
  const example = {
    simplified: '学习',
    traditional: '學習',
    pinyin: 'xuéxí',
    meaningVietnamese: 'học tập',
    meaningEnglish: 'to study',
    hskLevel: 'HSK 1',
    audioUrl: '',
    exampleChinese: '我学习中文。',
    examplePinyin: 'Wǒ xuéxí Zhōngwén.',
    exampleVietnamese: 'Tôi học tiếng Trung.',
  };
  return rowsToCsv(VOCABULARY_IMPORT_HEADERS, [example]);
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text || '').replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return recordsFromRows(rows, 'CSV');
}

export async function parseVocabularyFile(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.xlsx')) return parseXlsx(file);
  if (name.endsWith('.xls')) {
    throw new Error('Định dạng .xls cũ chưa được hỗ trợ. Hãy lưu lại thành .xlsx hoặc CSV UTF-8.');
  }
  if (name.endsWith('.csv') || file?.type === 'text/csv') return parseCsv(await file.text());
  throw new Error('Chỉ hỗ trợ file .xlsx hoặc .csv.');
}
