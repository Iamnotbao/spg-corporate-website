import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'spg-language';

export function normalizePublicLanguage(value) {
  const code = String(value || 'vi').trim().toLowerCase();
  if (code === 'zh' || code === 'zh-tw' || code === 'zh-hant') return 'zh-tw';
  if (code === 'en' || code.startsWith('en-')) return 'en';
  return 'vi';
}

export function getPublicLanguage() {
  if (typeof window === 'undefined') return 'vi';
  return normalizePublicLanguage(window.localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || 'vi');
}

export function usePublicLanguage() {
  const [language, setLanguage] = useState(getPublicLanguage);
  useEffect(() => {
    const handleLanguage = (event) => setLanguage(normalizePublicLanguage(event?.detail?.code || getPublicLanguage()));
    window.addEventListener('spg-language-change', handleLanguage);
    return () => window.removeEventListener('spg-language-change', handleLanguage);
  }, []);
  return language;
}

const messages = {
  vi: {
    explore: 'Khám phá', menuIntro: 'Thông tin doanh nghiệp sản xuất giày, hoạt động, tin tức và cơ hội nghề nghiệp.', contact: 'Liên hệ với SPG', navLabel: 'Điều hướng chính', openMenu: 'Mở trình đơn', closeMenu: 'Đóng trình đơn',
    about: 'Giới thiệu', services: 'Sản xuất', news: 'Tin tức', careers: 'Tuyển dụng',
    coreValues: 'Giá trị cốt lõi', vision: 'Tầm nhìn & sứ mệnh', highlights: 'Con số & dấu ấn', journey: 'Hành trình phát triển', partners: 'Đối tác & hợp tác', location: 'Vị trí công ty', achievements: 'Thành tựu đạt được', workplace: 'Cảnh quan nội bộ',
    transport: 'Phát triển mẫu & kỹ thuật', warehouse: 'Cắt · may · lắp ráp', consulting: 'Năng lực sản xuất', process: 'Quy trình sản xuất',
    activities: 'Hoạt động', talent: 'Phát triển nhân tài', union: 'Công đoàn', companyNews: 'Tin doanh nghiệp', openings: 'Vị trí đang tuyển', workEnvironment: 'Môi trường làm việc', apply: 'Gửi hồ sơ',
    all: 'Tất cả', readArticle: 'Đọc bài viết', viewPosition: 'Xem vị trí', hiring: 'Đang tuyển', emptyCategory: 'Chưa có bài viết trong nhóm này.', newsFallback: 'Tin tức SPG', jobFallback: 'Cơ hội nghề nghiệp tại SPG',
  },
  en: {
    explore: 'Explore', menuIntro: 'Footwear manufacturing, company activities, news and career opportunities.', contact: 'Contact SPG', navLabel: 'Primary navigation', openMenu: 'Open menu', closeMenu: 'Close menu',
    about: 'About', services: 'Manufacturing', news: 'News', careers: 'Careers',
    coreValues: 'Core values', vision: 'Vision & mission', highlights: 'Facts & highlights', journey: 'Our journey', partners: 'Partners & cooperation', location: 'Company location', achievements: 'Achievements', workplace: 'Workplace',
    transport: 'Sample development & engineering', warehouse: 'Cut · stitch · assembly', consulting: 'Manufacturing capabilities', process: 'Production process',
    activities: 'Activities', talent: 'Talent development', union: 'Union', companyNews: 'Company news', openings: 'Open positions', workEnvironment: 'Work environment', apply: 'Apply',
    all: 'All', readArticle: 'Read article', viewPosition: 'View position', hiring: 'Hiring', emptyCategory: 'No articles in this category yet.', newsFallback: 'SPG News', jobFallback: 'Career opportunity at SPG',
  },
  'zh-tw': {
    explore: '探索', menuIntro: '鞋類製造、企業活動、新聞與職涯機會。', contact: '聯絡 SPG', navLabel: '主要導覽', openMenu: '開啟選單', closeMenu: '關閉選單',
    about: '關於我們', services: '製造', news: '新聞', careers: '人才招募',
    coreValues: '核心價值', vision: '願景與使命', highlights: '數據與成果', journey: '發展歷程', partners: '合作夥伴', location: '公司位置', achievements: '企業成就', workplace: '工作環境',
    transport: '樣品開發與工程', warehouse: '裁切 · 車縫 · 組裝', consulting: '製造能力', process: '生產流程',
    activities: '企業活動', talent: '人才發展', union: '工會', companyNews: '企業新聞', openings: '招募職缺', workEnvironment: '工作環境', apply: '投遞履歷',
    all: '全部', readArticle: '閱讀文章', viewPosition: '查看職缺', hiring: '招募中', emptyCategory: '此分類目前沒有文章。', newsFallback: 'SPG 新聞', jobFallback: 'SPG 職涯機會',
  },
};

export function usePublicMessages() {
  const language = usePublicLanguage();
  return useMemo(() => ({ language, t: (key) => messages[language]?.[key] || messages.vi[key] || key }), [language]);
}

export function localizeContent(item, language) {
  if (!item || typeof item !== 'object') return item;
  const lang = normalizePublicLanguage(language);
  if (lang === 'vi') return item;
  const translations = item.translations && typeof item.translations === 'object' ? item.translations : {};
  const translated = translations[lang] || translations[lang === 'zh-tw' ? 'zh' : lang] || {};
  if (!translated || typeof translated !== 'object') return item;
  return { ...item, ...Object.fromEntries(Object.entries(translated).filter(([, value]) => value !== '' && value != null)) };
}
