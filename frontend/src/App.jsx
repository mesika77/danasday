import React, { useEffect, useState } from 'react';
import { getBoards } from './api';
import { useAuth } from './context/AuthContext';
import BoardView from './pages/BoardView';
import CalendarView from './pages/CalendarView';
import LoginGate from './components/LoginGate';
import styles from './App.module.css';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    if (!user) return;
    getBoards().then(({ data }) => {
      setBoards(data);
      if (data.length) setActiveTab(data[0].id);
    });
  }, [user]);

  const activeBoard = boards.find((b) => b.id === activeTab);

  if (loading) return null; // wait for auth check
  if (!user)   return <LoginGate />;

  // Icons for bottom nav
  const boardIcons = [
    // checklist / kanban
    <svg key="board" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="11" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/></svg>,
    // graduation cap
    <svg key="uni" viewBox="0 0 24 24"><path d="M2 10l10-6 10 6-10 6-10-6z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><line x1="22" y1="10" x2="22" y2="16"/></svg>,
  ];
  const calendarIcon = (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  );

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
          <div className={styles.userMenu}>
            {user.picture && <img src={user.picture} className={styles.avatar} alt={user.name} referrerPolicy="no-referrer" />}
            <span className={styles.userName}>{user.name?.split(' ')[0]}</span>
            <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {activeTab === 'calendar' ? (
          <CalendarView />
        ) : activeBoard ? (
          <BoardView boardId={activeBoard.id} boardName={activeBoard.name} />
        ) : null}
      </main>

      {/* Mobile bottom nav */}
      <nav className={styles.bottomNav}>
        {boards.map((b, i) => (
          <button
            key={b.id}
            className={`${styles.bottomTab} ${b.id === activeTab ? styles.active : ''}`}
            onClick={() => setActiveTab(b.id)}
          >
            {boardIcons[i] || boardIcons[0]}
            {b.name}
          </button>
        ))}
        <button
          className={`${styles.bottomTab} ${activeTab === 'calendar' ? styles.active : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          {calendarIcon}
          Calendar
        </button>
      </nav>
    </div>
  );
}
