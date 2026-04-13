import React, { useState, useEffect, useRef } from 'react';
import styles from './ThemePicker.module.css';

const THEMES = [
  { name: 'Beige',    value: '#c8b49a' },
  { name: 'Lavender', value: '#c9b8e8' },
  { name: 'Blush',    value: '#e8a0b8' },
  { name: 'Sage',     value: '#94bb94' },
  { name: 'Sky',      value: '#84b8d8' },
  { name: 'Peach',    value: '#e8bc84' },
  { name: 'Coral',    value: '#e09080' },
  { name: 'Mint',     value: '#80ccb0' },
  { name: 'Rose',     value: '#d4889c' },
];

export function applyTheme(color) {
  document.documentElement.style.setProperty('--lavender', color);
  try { localStorage.setItem('dd_theme', color); } catch {
    try { sessionStorage.setItem('dd_theme', color); } catch {}
  }
}

export function loadSavedTheme() {
  try {
    const saved = localStorage.getItem('dd_theme') || sessionStorage.getItem('dd_theme');
    if (saved) document.documentElement.style.setProperty('--lavender', saved);
  } catch {}
}

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue('--lavender').trim() || '#c8b49a'
  );
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const pick = (color) => {
    applyTheme(color);
    setCurrent(color);
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.trigger}
        style={{ background: current }}
        onClick={() => setOpen(o => !o)}
        title="Theme color"
        aria-label="Choose theme color"
      />
      {open && (
        <div className={styles.popover}>
          <p className={styles.label}>Theme color</p>
          <div className={styles.grid}>
            {THEMES.map((t) => (
              <button
                key={t.value}
                className={`${styles.swatch} ${current === t.value ? styles.active : ''}`}
                style={{ background: t.value }}
                title={t.name}
                onClick={() => pick(t.value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
