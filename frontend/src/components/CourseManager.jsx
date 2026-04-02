import React, { useState } from 'react';
import { createCourse, updateCourse, deleteCourse } from '../api';
import styles from './CourseManager.module.css';

const PALETTE = [
  '#c9b8e8', '#f5c6d0', '#b5ccb8', '#f7d4b5',
  '#b8d8e8', '#e8e8b5', '#e8c9b8', '#d4b8e8',
  '#b8e8d4', '#e8b8d4',
];

// Reusable color picker: swatches + a native color input for any color
function ColorPicker({ value, onChange }) {
  return (
    <div className={styles.colorPicker}>
      <div className={styles.miniPalette}>
        {PALETTE.map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.swatch} ${value === p ? styles.selected : ''}`}
            style={{ background: p }}
            onClick={() => onChange(p)}
          />
        ))}
        {/* Native color input as the last "swatch" — any color */}
        <label className={styles.customSwatch} title="Pick any color">
          <span style={{ background: PALETTE.includes(value) ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' : value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

export default function CourseManager({ courses, onClose, onSaved }) {
  const [list, setList]         = useState(courses);
  const [newName, setNewName]   = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data } = await createCourse({ name: newName.trim(), color: newColor });
    setList([...list, data]);
    setNewName('');
    setNewColor(PALETTE[0]);
    onSaved();
  };

  const startEdit = (c) => { setEditId(c.id); setEditName(c.name); setEditColor(c.color); };

  const handleUpdate = async (id) => {
    const { data } = await updateCourse(id, { name: editName.trim(), color: editColor });
    setList(list.map((c) => (c.id === id ? data : c)));
    setEditId(null);
    onSaved();
  };

  const handleDelete = async (id) => {
    await deleteCourse(id);
    setList(list.filter((c) => c.id !== id));
    onSaved();
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Manage Courses</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.list}>
            {list.length === 0 && <p className={styles.empty}>No courses yet.</p>}
            {list.map((c) => (
              <div key={c.id} className={styles.row}>
                {editId === c.id ? (
                  <>
                    <input
                      className={styles.editInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c.id)}
                      autoFocus
                    />
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <div className={styles.rowActions}>
                      <button className={styles.saveBtn} onClick={() => handleUpdate(c.id)}>Save</button>
                      <button className={styles.cancelBtn} onClick={() => setEditId(null)}>✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className={styles.dot} style={{ background: c.color }} />
                    <span className={styles.name}>{c.name}</span>
                    <div className={styles.rowActions}>
                      <button className={styles.editBtn} onClick={() => startEdit(c)}>Edit</button>
                      <button className={styles.delBtn} onClick={() => handleDelete(c.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} className={styles.addForm}>
            <p className={styles.sectionLabel}>Add course</p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Calculus II"
              className={styles.addInput}
            />
            <ColorPicker value={newColor} onChange={setNewColor} />
            <button type="submit" className={styles.addBtn}>+ Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}
