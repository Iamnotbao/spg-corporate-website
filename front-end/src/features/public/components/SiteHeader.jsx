import { useEffect, useMemo, useState } from 'react';
import ThemeToggle from '../../shared/ThemeToggle.jsx';
import { usePublicMessages } from '../i18n.js';
import Brand from './Brand.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import PublicSearchOverlay from './PublicSearchOverlay.jsx';

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = usePublicMessages();

  const navigation = useMemo(() => [
    { label: t('about'), href: '/#about', children: [[t('coreValues'), '/#about'], [t('vision'), '/#about'], [t('highlights'), '/company/highlights'], [t('journey'), '/#process'], [t('partners'), '/company/partners'], [t('location'), '/company/location'], [t('achievements'), '/company/highlights'], [t('workplace'), '/#careers']] },
    { label: t('services'), href: '/#manufacturing', children: [[t('transport'), '/#manufacturing'], [t('warehouse'), '/#manufacturing'], [t('consulting'), '/company/supply-chain-consulting'], [t('process'), '/#process']] },
    { label: t('news'), href: '/#news', children: [[t('activities'), '/#news'], [t('talent'), '/#news'], [t('union'), '/#news'], [t('companyNews'), '/#news']] },
    { label: t('careers'), href: '/#careers', children: [[t('openings'), '/#careers'], [t('workEnvironment'), '/#careers'], [t('apply'), '/#careers']] },
  ], [t]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`public-header public-header--hamburger${menuOpen ? ' is-open' : ''}`}>
      <div className="public-container public-header__inner"><Brand onNavigate={closeMenu} /><div className="public-header__utilities"><button className="public-search-toggle" type="button" aria-label="Search" onClick={() => { setMenuOpen(false); setSearchOpen(true); }}>⌕</button><LanguageSwitcher /><ThemeToggle compact /><button className={`public-menu-toggle public-menu-toggle--desktop${menuOpen ? ' is-open' : ''}`} type="button" aria-controls="public-site-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? t('closeMenu') : t('openMenu')} onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /></button></div></div>
      <button aria-label={t('closeMenu')} className={`public-menu-scrim${menuOpen ? ' is-open' : ''}`} onClick={closeMenu} tabIndex={menuOpen ? 0 : -1} type="button" />
      <div className={`public-mega-menu${menuOpen ? ' is-open' : ''}`} id="public-site-navigation" aria-hidden={!menuOpen}>
        <div className="public-container public-mega-menu__inner"><div className="public-mega-menu__intro"><span className="public-mega-menu__kicker">Chí Hùng SPG</span><strong>{t('explore')}</strong><p>{t('menuIntro')}</p><a href="/#contact" onClick={closeMenu}>{t('contact')} <span aria-hidden="true">↗</span></a></div><nav className="public-mega-menu__nav" aria-label={t('navLabel')}>{navigation.map((group,index) => <section className="public-mega-menu__group" key={group.label} style={{ '--menu-order': index }}><a className="public-mega-menu__title" href={group.href} onClick={closeMenu}><span>{String(index + 1).padStart(2,'0')}</span><strong>{group.label}</strong><i aria-hidden="true">↗</i></a><div className="public-mega-menu__subnav">{group.children.map(([label,href],childIndex) => <a href={href} key={`${group.label}-${label}`} onClick={closeMenu} style={{ '--sub-order': childIndex }}><span>{label}</span><i aria-hidden="true">→</i></a>)}</div></section>)}</nav></div>
      </div>
      <PublicSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
