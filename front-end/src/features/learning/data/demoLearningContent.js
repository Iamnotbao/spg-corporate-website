// UI-only examples for Phase 2. They are always labelled as demo content in the UI.
export const HSK_LEVELS = [
  {
    level: 1,
    label: 'Nhập môn',
    description: 'Bắt đầu với phát âm và giao tiếp cơ bản.',
  },
  {
    level: 2,
    label: 'Sơ cấp',
    description: 'Mở rộng mẫu câu cho những tình huống quen thuộc.',
  },
  {
    level: 3,
    label: 'Chuyển tiếp',
    description: 'Củng cố nền tảng để diễn đạt linh hoạt hơn.',
  },
  {
    level: 4,
    label: 'Trung cấp',
    description: 'Phát triển khả năng đọc hiểu và giao tiếp dài hơn.',
  },
  {
    level: 5,
    label: 'Trung cao cấp',
    description: 'Tiếp cận nội dung đa dạng với độ chính xác cao hơn.',
  },
  {
    level: 6,
    label: 'Nâng cao',
    description: 'Hướng đến khả năng xử lý ngôn ngữ phức tạp.',
  },
];

export const DEMO_CHARACTERS = [
  {
    simplified: '学',
    traditional: '學',
    pinyin: 'xué',
    meaning: 'học',
    radical: '子',
    strokes: 8,
    level: 'HSK 1',
    examples: ['学生 · học sinh', '学习 · học tập'],
  },
  {
    simplified: '好',
    traditional: '好',
    pinyin: 'hǎo',
    meaning: 'tốt, khỏe',
    radical: '女',
    strokes: 6,
    level: 'HSK 1',
    examples: ['你好 · xin chào', '很好 · rất tốt'],
  },
  {
    simplified: '语',
    traditional: '語',
    pinyin: 'yǔ',
    meaning: 'ngôn ngữ, lời nói',
    radical: '讠',
    strokes: 9,
    level: 'HSK 2',
    examples: ['汉语 · tiếng Trung', '语言 · ngôn ngữ'],
  },
];

export const PRACTICE_AREAS = [
  {
    slug: 'vocabulary',
    title: 'Ôn từ vựng',
    description: 'Nền tảng cho hoạt động nhận diện và củng cố từ vựng.',
    character: '词',
    to: '/vocabulary',
  },
  {
    slug: 'quiz',
    title: 'Quiz',
    description: 'Làm Quiz trong bài học đã xuất bản và lưu kết quả theo tài khoản.',
    character: '测',
    to: '/practice/quiz',
  },
  {
    slug: 'listening',
    title: 'Luyện nghe',
    description: 'Nền tảng cho hoạt động nghe hiểu theo cấp độ.',
    character: '听',
    to: '/practice/listening',
  },
  {
    slug: 'characters',
    title: 'Ôn Hán tự',
    description: 'Quay lại các chữ đã học theo nhóm và ngữ cảnh.',
    character: '字',
    to: '/characters',
  },
  {
    slug: 'grammar',
    title: 'Ngữ pháp',
    description: 'Nền tảng cho bài tập sắp xếp và hoàn thành câu.',
    character: '句',
    to: '/practice/grammar',
  },
];
