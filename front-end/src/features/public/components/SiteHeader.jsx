import { useEffect, useState } from 'react';
import Brand from './Brand.jsx';

const navigation = [
  {
    label: 'Giới thiệu',
    href: '/#about',
    children: [
      ['Giá trị cốt lõi', '/#about'],
      ['Tầm nhìn & sứ mệnh', '/#about'],
      ['Con số & dấu ấn', '/#operating-highlights'],
      ['Hành trình phát triển', '/#journey'],
      ['Đối tác & hợp tác', '/#partners'],
      ['Vị trí công ty', '/#contact'],
      ['Thành tựu đạt được', '/#achievements'],
      ['Cảnh quan nội bộ', '/#company-life'],
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
      ['Môi trường làm việc', '/#company-life'],
      ['Gửi hồ sơ', '/#careers'],
    ],
  },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('public-menu-open', menuOpen);
    if (!menuOpen) return () => document.body.classList.remove('public-menu-open');

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('public-menu-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="public-header public-header--hamburger">
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
          <small>{menuOpen ? 'Đóng' : 'Menu'}</small>
        </button>
      </div>

      <div
        className={`public-mega-menu${menuOpen ? ' is-open' : ''}`}
        id="public-site-navigation"
        aria-hidden={!menuOpen}
      >
        <div className="public-container public-mega-menu__inner">
          <div className="public-mega-menu__intro">
            <p className="public-eyebrow public-eyebrow--light">Chí Hùng SPG</p>
            <h2>Khám phá doanh nghiệp theo cách rõ ràng hơn.</h2>
            <p>
              Tìm nhanh thông tin về doanh nghiệp, hoạt động, tin tức và cơ hội nghề nghiệp.
            </p>
            <a href="/#contact" onClick={closeMenu}>
              Liên hệ với SPG <span aria-hidden="true">↗</span>
            </a>
          </div>

          <nav className="public-mega-menu__nav" aria-label="Điều hướng chính">
            {navigation.map((group, index) => (
              <section className="public-mega-menu__group" key={group.label}>
                <a className="public-mega-menu__title" href={group.href} onClick={closeMenu}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {group.label}
                </a>
                <div className="public-mega-menu__subnav">
                  {group.children.map(([label, href]) => (
                    <a href={href} key={`${group.label}-${label}`} onClick={closeMenu}>
                      {label}
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
