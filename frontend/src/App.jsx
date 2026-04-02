import React, { useEffect, useState } from 'react';
import { getBoards } from './api';
import BoardView from './pages/BoardView';
import styles from './App.module.css';

export default function App() {
  const [boards, setBoards] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    getBoards().then(({ data }) => {
      setBoards(data);
      if (data.length) setActiveId(data[0].id);
    });
  }, []);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.logo}>dana's day</h1>
        <nav className={styles.nav}>
          {boards.map((b) => (
            <button
              key={b.id}
              className={`${styles.tab} ${b.id === activeId ? styles.active : ''}`}
              onClick={() => setActiveId(b.id)}
            >
              {b.name}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {activeId && (
          <BoardView
            boardId={activeId}
            boardName={boards.find((b) => b.id === activeId)?.name}
          />
        )}
      </main>
    </div>
  );
}
