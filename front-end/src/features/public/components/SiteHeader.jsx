import { useEffect, useState } from 'react';
import Brand from './Brand.jsx';

const navigation = [
  {
    label: 'Giới thiệu',
    href: '/#about',
    children: [
      ['Giá trị cốt lõi', '/#about'],
      ['Tầm nhìn & sứ mệnh', '/#about'],
      ['Con số & dấu ấn', '/#about'],
      ['Hành trình phát triển', '/#journey'],
      ['Đối tác & hợp tác', '/#services'],
      ['Vị trí công ty', '/#contact'],
      ['Thành tựu đạt được', '/#journey'],
      ['Cảnh quan nội bộ', '/#careers'],
    ],
  },
  {
    label: 'Dịch vụ',
    href: '/#services',
    children: [
      ['Vận tải & giao nhận', '/#services'],
      ['Kho bãi & phân phối', '/#services'],
      ['Tư vấn chuỗi cung ứng', '/#services'],
      ['Quy trình vận hành', '/#process'],
    ],
  },
  {
    label: 'Tin tức',
    href: '/#news',
    children: [
      ['Hoạt động', '/#news'],
      ['Phát triển nhân tài', '/#news'],
      ['Công đoàn', '/#news'],
      ['Tin doanh nghiệp', '/#news'],
    ],
  },
  {
    label: 'Tuyển dụng',
    href: '/#careers',
    children: [
      ['Vị trí đang tuyển', '/#careers'],
      ['Môi trường làm việc', '/#careers'],
      ['Gửi hồ sơ', '/#careers'],
    ],
  },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`public-header public-header--hamburger${menuOpen ? ' is-open' : ''}`}>
      <div className="public-container public-header__inner">
        <Brand onNavigate={closeMenu} />

        <button
          className={`public-menu-toggle public-menu-toggle--desktop${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-controls="public-site-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Đóng trình đơn' : 'Mở trình đơn'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <button
        aria-label="Đóng trình đơn"
        className={`public-menu-scrim${menuOpen ? ' is-open' : ''}`}
        onClick={closeMenu}
        tabIndex={menuOpen ? 0 : -1}
        type="button"
      />

      <div
        className={`public-mega-menu${menuOpen ? ' is-open' : ''}`}
        id="public-site-navigation"
        aria-hidden={!menuOpen}
      >
        <div className="public-container public-mega-menu__inner">
          <div className="public-mega-menu__intro">
            <span className="public-mega-menu__kicker">Chí Hùng SPG</span>
            <strong>Khám phá</strong>
            <p>Thông tin doanh nghiệp, hoạt động, tin tức và cơ hội nghề nghiệp.</p>
            <a href="/#contact" onClick={closeMenu}>
              Liên hệ với SPG <span aria-hidden="true">↗</span>
            </a>
          </div>

          <nav className="public-mega-menu__nav" aria-label="Điều hướng chính">
            {navigation.map((group, index) => (
              <section
                className="public-mega-menu__group"
                key={group.label}
                style={{ '--menu-order': index }}
              >
                <a className="public-mega-menu__title" href={group.href} onClick={closeMenu}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{group.label}</strong>
                  <i aria-hidden="true">↗</i>
                </a>
                <div className="public-mega-menu__subnav">
                  {group.children.map(([label, href], childIndex) => (
                    <a
                      href={href}
                      key={`${group.label}-${label}`}
                      onClick={closeMenu}
                      style={{ '--sub-order': childIndex }}
                    >
                      <span>{label}</span>
                      <i aria-hidden="true">→</i>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
