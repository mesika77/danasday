import React, { useEffect, useState } from 'react';
import { getBoards } from './api';
import { useAuth } from './context/AuthContext';
import BoardView from './pages/BoardView';
import CalendarView from './pages/CalendarView';
import styles from './App.module.css';

export default function App() {
  const { user, login, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const [activeTab, setActiveTab] = useState(null); // board id or 'calendar'

  useEffect(() => {
    getBoards().then(({ data }) => {
      setBoards(data);
      if (data.length) setActiveTab(data[0].id);
    });
  }, []);

  const activeBoard = boards.find((b) => b.id === activeTab);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.logo}>dana's day</h1>
        <nav className={styles.nav}>
          {boards.map((b) => (
            <button
              key={b.id}
              className={`${styles.tab} ${b.id === activeTab ? styles.active : ''}`}
              onClick={() => setActiveTab(b.id)}
            >
              {b.name}
            </button>
          ))}
          <button
            className={`${styles.tab} ${activeTab === 'calendar' ? styles.active : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            Calendar
          </button>
        </nav>

        {/* User area */}
        <div className={styles.userArea}>
          {user ? (
            <div className={styles.userMenu}>
              {user.picture && <img src={user.picture} className={styles.avatar} alt={user.name} referrerPolicy="no-referrer" />}
              <span className={styles.userName}>{user.name?.split(' ')[0]}</span>
              <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
            </div>
          ) : (
            <button className={styles.connectBtn} onClick={login}>
              Connect Calendar
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {activeTab === 'calendar' ? (
          <CalendarView />
        ) : activeBoard ? (
          <BoardView boardId={activeBoard.id} boardName={activeBoard.name} />
        ) : null}
      </main>
    </div>
  );
}
