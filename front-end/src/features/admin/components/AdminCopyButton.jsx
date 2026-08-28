import { useEffect, useRef, useState } from 'react';
import AdminIcon from './AdminIcon.jsx';

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy failed');
}

export default function AdminCopyButton({
  label = 'nội dung',
  onNotify,
  showLabel = false,
  value,
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);
  const text = String(value ?? '').trim();

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function handleCopy(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!text) return;

    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else fallbackCopy(text);
      setCopied(true);
      onNotify?.(`Đã copy ${label}.`);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      onNotify?.(`Không thể copy ${label}.`, 'error');
    }
  }

  return (
    <button
      aria-label={copied ? `Đã copy ${label}` : `Copy ${label}`}
      className={`admin-copy-button${copied ? ' is-copied' : ''}`}
      disabled={!text}
      onClick={handleCopy}
      title={copied ? 'Đã copy' : `Copy ${label}`}
      type="button"
    >
      <AdminIcon name={copied ? 'check' : 'copy'} size={14} />
      {showLabel && <span>{copied ? 'Đã copy' : 'Copy'}</span>}
    </button>
  );
}
