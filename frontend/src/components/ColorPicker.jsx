import React from 'react';
import styles from './ColorPicker.module.css';

const PALETTE = [
  '#c9b8e8', '#f5c6d0', '#b5ccb8', '#f7d4b5',
  '#b8d8e8', '#e8e8b5', '#e8c9b8', '#d4b8e8',
  '#b8e8d4', '#e8b8d4',
];

export { PALETTE };

export default function ColorPicker({ value, onChange }) {
  return (
    <div className={styles.row}>
      {PALETTE.map((p) => (
        <button
          key={p}
          type="button"
          className={`${styles.swatch} ${value === p ? styles.selected : ''}`}
          style={{ background: p }}
          onClick={() => onChange(p)}
        />
      ))}
      {/* Any-color picker */}
      <label className={styles.customSwatch} title="Pick any color">
        <span style={{ background: PALETTE.includes(value) ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' : value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
