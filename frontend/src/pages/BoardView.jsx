import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { getBoard, getCourses, reorderTasks } from '../api';
import Column from '../components/Column';
import TaskModal from '../components/TaskModal';
import CourseManager from '../components/CourseManager';
import UrgentBanner from '../components/UrgentBanner';
import { isUrgent, isTerminalColumn } from '../utils/urgency';
import styles from './BoardView.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function BoardView({ boardId, boardName }) {
  const [board, setBoard]               = useState(null);
  const [courses, setCourses]           = useState([]);
  const [editingTask, setEditingTask]   = useState(null);
  const [addingTo, setAddingTo]         = useState(null);
  const [showCourses, setShowCourses]   = useState(false);
  const [filterCourse, setFilterCourse] = useState(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterMonth, setFilterMonth]   = useState('');   // Personal
  const [filterDue, setFilterDue]       = useState('');   // Personal: overdue|today|week
  const notifiedRef = useRef(new Set());

  const isUniversity = boardName === 'University';

  const load = useCallback(() => {
    getBoard(boardId).then(({ data }) => setBoard(data));
  }, [boardId]);

  const loadCourses = useCallback(() => {
    if (isUniversity) getCourses().then(({ data }) => setCourses(data));
  }, [isUniversity]);

  useEffect(() => { load(); loadCourses(); }, [load, loadCourses]);

  // Browser notifications for urgent tasks
  useEffect(() => {
    if (!board) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    const urgentTasks = board.columns.flatMap((col) =>
      isTerminalColumn(col.title) ? [] : col.tasks.filter((t) => isUrgent(t, col.title))
    );

    const notify = () => {
      urgentTasks.forEach((t) => {
        if (notifiedRef.current.has(t.id)) return;
        notifiedRef.current.add(t.id);
        new Notification('DanasDay ⚡', {
          body: `"${t.title}" is due very soon!`,
          icon: '/favicon.ico',
        });
      });
    };

    if (urgentTasks.length === 0) return;

    if (Notification.permission === 'granted') {
      notify();
    } else {
      Notification.requestPermission().then((p) => { if (p === 'granted') notify(); });
    }
  }, [board]);

  if (!board) return <div className={styles.loading}>Loading...</div>;

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));

  // Collect all urgent tasks across non-terminal columns for the banner
  const urgentTasks = board.columns.flatMap((col) =>
    isTerminalColumn(col.title) ? [] : col.tasks.filter((t) => isUrgent(t, col.title))
  );

  const filteredTasks = (tasks) =>
    tasks.filter((t) => {
      if (filterCourse && t.course_id !== filterCourse) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (!isUniversity) {
        // Month filter
        if (filterMonth !== '' && t.due_date) {
          const m = new Date(t.due_date).getMonth();
          if (m !== Number(filterMonth)) return false;
        }
        // Due-soon quick filter
        if (filterDue) {
          if (!t.due_date) return false;
          const due  = new Date(t.due_date); due.setHours(23,59,59);
          const now  = Date.now();
          const diff = due - now;
          if (filterDue === 'overdue' && diff >= 0) return false;
          if (filterDue === 'today'   && (diff < 0 || diff > 864e5)) return false;
          if (filterDue === 'week'    && (diff < 0 || diff > 7*864e5)) return false;
        }
      }
      return true;
    });

  const onDragEnd = async (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newCols = board.columns.map((col) => ({ ...col, tasks: [...col.tasks] }));
    const srcCol  = newCols.find((c) => String(c.id) === source.droppableId);
    const dstCol  = newCols.find((c) => String(c.id) === destination.droppableId);

    const [moved] = srcCol.tasks.splice(source.index, 1);
    moved.column_id = dstCol.id;
    dstCol.tasks.splice(destination.index, 0, moved);

    const updates = [];
    dstCol.tasks.forEach((t, i) => { t.position = i; updates.push({ id: t.id, column_id: dstCol.id, position: i }); });
    if (srcCol.id !== dstCol.id) {
      srcCol.tasks.forEach((t, i) => { t.position = i; updates.push({ id: t.id, column_id: srcCol.id, position: i }); });
    }

    setBoard({ ...board, columns: newCols });
    await reorderTasks(updates).catch(() => load());
  };

  const clearFilters = () => { setFilterCourse(null); setFilterPriority(''); setFilterMonth(''); setFilterDue(''); };
  const activeFilters = (filterCourse ? 1 : 0) + (filterPriority ? 1 : 0) + (filterMonth !== '' ? 1 : 0) + (filterDue ? 1 : 0);

  return (
    <div className={styles.wrap}>
      {/* Urgent banner */}
      <UrgentBanner
        tasks={urgentTasks}
        courseMap={courseMap}
        onTaskClick={(task) => {
          const col = board.columns.find((c) => c.id === task.column_id);
          setEditingTask({ task, columnId: col?.id });
        }}
      />

      {/* Filter / action bar */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {isUniversity && (
            <select
              className={styles.select}
              value={filterCourse || ''}
              onChange={(e) => setFilterCourse(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All courses</option>
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          )}

          <select className={styles.select} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {/* Personal-only filters */}
          {!isUniversity && (
            <>
              <select
                className={styles.select}
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">All months</option>
                {MONTHS.map((m, i) => (<option key={i} value={i}>{m}</option>))}
              </select>

              {['overdue', 'today', 'week'].map((key) => (
                <button
                  key={key}
                  className={`${styles.quickBtn} ${filterDue === key ? styles.quickActive : ''}`}
                  onClick={() => setFilterDue(filterDue === key ? '' : key)}
                >
                  {key === 'overdue' ? 'Overdue' : key === 'today' ? 'Due today' : 'This week'}
                </button>
              ))}
            </>
          )}

          {activeFilters > 0 && (
            <button className={styles.clearBtn} onClick={clearFilters}>Clear filters</button>
          )}
        </div>

        {isUniversity && (
          <button className={styles.manageBtn} onClick={() => setShowCourses(true)}>
            Manage courses
          </button>
        )}
      </div>

      {/* Kanban board */}
      <div className={styles.board}>
        <DragDropContext onDragEnd={onDragEnd}>
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={{ ...col, tasks: filteredTasks(col.tasks) }}
              courseMap={courseMap}
              onAddTask={() => setAddingTo(col.id)}
              onEditTask={(task) => setEditingTask({ task, columnId: col.id })}
            />
          ))}
        </DragDropContext>
      </div>

      {(editingTask || addingTo) && (
        <TaskModal
          task={editingTask?.task || null}
          columnId={editingTask?.columnId || addingTo}
          columns={board.columns}
          courses={isUniversity ? courses : undefined}
          onClose={() => { setEditingTask(null); setAddingTo(null); }}
          onSaved={() => { setEditingTask(null); setAddingTo(null); load(); }}
        />
      )}

      {showCourses && (
        <CourseManager
          courses={courses}
          onClose={() => setShowCourses(false)}
          onSaved={() => { loadCourses(); load(); }}
        />
      )}
    </div>
  );
}
