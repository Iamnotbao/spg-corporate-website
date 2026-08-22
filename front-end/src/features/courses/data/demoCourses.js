// UI-only content for Phase 2. Every consumer must surface the demo state visibly.
// Replace this module through the course service when the real learning API exists.
export const DEMO_COURSES = [
  {
    slug: 'nen-tang-hsk-1-demo',
    title: 'Nền tảng tiếng Trung HSK 1',
    summary: 'Làm quen với phát âm, thanh điệu và những mẫu câu giao tiếp đầu tiên.',
    description:
      'Bản minh họa cho một lộ trình nhập môn có cấu trúc từ phát âm đến hội thoại cơ bản.',
    level: 'HSK 1',
    coverCharacter: '你',
    tone: 'red',
    isDemo: true,
    units: [
      {
        slug: 'phat-am-va-thanh-dieu',
        title: 'Phát âm và thanh điệu',
        lessons: [
          {
            slug: 'lam-quen-voi-pinyin',
            title: 'Làm quen với Pinyin',
            type: 'grammar',
            summary: 'Hiểu vai trò của Pinyin trong quá trình học phát âm.',
            content: [
              {
                type: 'intro',
                title: 'Pinyin là gì?',
                text: 'Pinyin là hệ thống phiên âm giúp người học nhận biết cách đọc tiếng Trung bằng chữ cái Latin.',
              },
              {
                type: 'example',
                chinese: '你好',
                pinyin: 'nǐ hǎo',
                meaning: 'xin chào',
              },
              {
                type: 'note',
                title: 'Gợi ý học',
                text: 'Hãy nghe và lặp lại theo từng âm tiết trước khi ghép thành cả từ.',
              },
            ],
          },
          {
            slug: 'bon-thanh-dieu',
            title: 'Bốn thanh điệu cơ bản',
            type: 'listening',
            summary: 'Nhận biết hình dáng và nhịp điệu của bốn thanh chính.',
            content: [
              {
                type: 'intro',
                title: 'Thanh điệu tạo nên nghĩa',
                text: 'Cùng một âm tiết có thể mang nghĩa khác nhau khi thanh điệu thay đổi.',
              },
              {
                type: 'example',
                chinese: '妈 · 麻 · 马 · 骂',
                pinyin: 'mā · má · mǎ · mà',
                meaning: 'bốn thanh điệu với âm tiết ma',
              },
            ],
          },
        ],
      },
      {
        slug: 'chao-hoi-co-ban',
        title: 'Chào hỏi cơ bản',
        lessons: [
          {
            slug: 'xin-chao-va-tam-biet',
            title: 'Xin chào và tạm biệt',
            type: 'vocabulary',
            summary: 'Sử dụng những cách chào hỏi quen thuộc trong hội thoại.',
            content: [
              {
                type: 'intro',
                title: 'Mở đầu một cuộc trò chuyện',
                text: 'Bắt đầu với các cụm từ ngắn, rõ nghĩa và luyện phản xạ theo cặp.',
              },
              {
                type: 'example',
                chinese: '你好！再见！',
                pinyin: 'Nǐ hǎo! Zàijiàn!',
                meaning: 'Xin chào! Tạm biệt!',
              },
            ],
          },
          {
            slug: 'tu-gioi-thieu',
            title: 'Tự giới thiệu',
            type: 'practice',
            summary: 'Ghép tên và thông tin cơ bản thành câu giới thiệu ngắn.',
            content: [
              {
                type: 'intro',
                title: 'Mẫu câu trọng tâm',
                text: 'Dùng cấu trúc 我叫… để nói tên của bạn.',
              },
              {
                type: 'example',
                chinese: '我叫安。',
                pinyin: 'Wǒ jiào Ān.',
                meaning: 'Tôi tên là An.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'han-tu-can-ban-demo',
    title: 'Làm quen với Hán tự',
    summary: 'Nhận diện cấu tạo chữ, bộ thủ và cách ghi nhớ Hán tự theo ngữ cảnh.',
    description:
      'Bản minh họa cho trải nghiệm học Hán tự từ hình dạng, ý nghĩa đến ví dụ sử dụng.',
    level: 'HSK 1',
    coverCharacter: '字',
    tone: 'jade',
    isDemo: true,
    units: [
      {
        slug: 'cau-tao-han-tu',
        title: 'Cấu tạo Hán tự',
        lessons: [
          {
            slug: 'net-va-bo-thu',
            title: 'Nét và bộ thủ',
            type: 'character',
            summary: 'Quan sát những thành phần cơ bản tạo nên một chữ Hán.',
            content: [
              {
                type: 'intro',
                title: 'Đọc cấu trúc trước khi viết',
                text: 'Quan sát vị trí các bộ phận giúp bạn hiểu và ghi nhớ chữ có hệ thống hơn.',
              },
              {
                type: 'example',
                chinese: '好',
                pinyin: 'hǎo',
                meaning: 'tốt, khỏe; gồm 女 và 子',
              },
            ],
          },
          {
            slug: 'ghi-nho-theo-ngu-canh',
            title: 'Ghi nhớ theo ngữ cảnh',
            type: 'reading',
            summary: 'Đặt Hán tự trong từ và câu thay vì học riêng lẻ.',
            content: [
              {
                type: 'intro',
                title: 'Từ chữ đến câu',
                text: 'Gắn chữ với một từ quen thuộc và một câu ngắn để tăng khả năng gợi nhớ.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'giao-tiep-hang-ngay-demo',
    title: 'Giao tiếp hằng ngày',
    summary: 'Luyện mẫu câu ngắn cho những tình huống quen thuộc trong cuộc sống.',
    description:
      'Bản minh họa cho lộ trình luyện nghe, đọc và phản xạ hội thoại theo chủ đề.',
    level: 'HSK 2',
    coverCharacter: '说',
    tone: 'gold',
    isDemo: true,
    units: [
      {
        slug: 'mot-ngay-cua-ban',
        title: 'Một ngày của bạn',
        lessons: [
          {
            slug: 'hoi-thoi-gian',
            title: 'Hỏi và nói thời gian',
            type: 'grammar',
            summary: 'Sử dụng cấu trúc hỏi giờ và mô tả lịch sinh hoạt.',
            content: [
              {
                type: 'intro',
                title: 'Hỏi giờ',
                text: 'Dùng 现在几点？ để hỏi thời gian hiện tại.',
              },
              {
                type: 'example',
                chinese: '现在几点？',
                pinyin: 'Xiànzài jǐ diǎn?',
                meaning: 'Bây giờ là mấy giờ?',
              },
            ],
          },
          {
            slug: 'kiem-tra-nhanh',
            title: 'Kiểm tra nhanh',
            type: 'quiz',
            summary: 'Nền tảng giao diện cho bài kiểm tra cuối chủ đề.',
            content: [
              {
                type: 'note',
                title: 'Chưa mở chấm điểm',
                text: 'Quiz và kết quả sẽ được kết nối khi quy tắc dữ liệu được xác nhận.',
              },
            ],
          },
        ],
      },
    ],
  },
];

export function findDemoCourse(slug) {
  return DEMO_COURSES.find((course) => course.slug === slug) || null;
}

export function flattenDemoLessons(course) {
  if (!course) return [];

  return course.units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({
      ...lesson,
      unitSlug: unit.slug,
      unitTitle: unit.title,
    })),
  );
}
