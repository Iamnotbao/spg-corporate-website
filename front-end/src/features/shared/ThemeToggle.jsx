import { useThemeMode } from './useThemeMode.js';
import '../../styles/theme.css';

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useThemeMode();
  const dark = theme === 'dark';

  return (
    <button
      className={`spg-theme-toggle${compact ? ' is-compact' : ''}`}
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
      {!compact && <small>{dark ? 'Sáng' : 'Tối'}</small>}
    </button>
  );
}
