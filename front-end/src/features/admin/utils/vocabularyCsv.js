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

function quoteCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function vocabularyToCsv(items = []) {
  const rows = items.map((item) =>
    VOCABULARY_CSV_HEADERS.map((header) => quoteCsv(item?.[header])).join(','),
  );
  return `\uFEFF${VOCABULARY_CSV_HEADERS.join(',')}\r\n${rows.join('\r\n')}`;
}

export function vocabularyTemplateCsv(defaultLessonId = '') {
  const example = {
    simplified: '学习',
    traditional: '學習',
    pinyin: 'xuéxí',
    meaningVietnamese: 'học tập',
    meaningEnglish: 'to study',
    hskLevel: 'HSK 1',
    lessonId: defaultLessonId,
    status: 'draft',
    audioUrl: '',
    exampleChinese: '我学习中文。',
    examplePinyin: 'Wǒ xuéxí Zhōngwén.',
    exampleVietnamese: 'Tôi học tiếng Trung.',
  };
  return vocabularyToCsv([example]);
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
  if (!rows.length) return [];

  const headers = rows.shift().map((header) => header.trim());
  const missing = VOCABULARY_CSV_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`CSV thiếu cột: ${missing.join(', ')}`);

  return rows.map((values, rowIndex) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    record.__row = rowIndex + 2;
    return record;
  });
}
