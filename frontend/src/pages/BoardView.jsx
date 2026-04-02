import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { getBoard, getCourses, reorderTasks } from '../api';
import Column from '../components/Column';
import TaskModal from '../components/TaskModal';
import CourseManager from '../components/CourseManager';
import styles from './BoardView.module.css';

export default function BoardView({ boardId, boardName }) {
  const [board, setBoard]               = useState(null);
  const [courses, setCourses]           = useState([]);
  const [editingTask, setEditingTask]   = useState(null);
  const [addingTo, setAddingTo]         = useState(null);
  const [showCourses, setShowCourses]   = useState(false);
  const [filterCourse, setFilterCourse] = useState(null);   // null = all
  const [filterPriority, setFilterPriority] = useState(''); // '' = all

  const isUniversity = boardName === 'University';

  const load = useCallback(() => {
    getBoard(boardId).then(({ data }) => setBoard(data));
  }, [boardId]);

  const loadCourses = useCallback(() => {
    if (isUniversity) getCourses().then(({ data }) => setCourses(data));
  }, [isUniversity]);

  useEffect(() => { load(); loadCourses(); }, [load, loadCourses]);

  if (!board) return <div className={styles.loading}>Loading...</div>;

  // Build course lookup map
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));

  // Apply filters to a column's tasks
  const filteredTasks = (tasks) =>
    tasks.filter((t) => {
      if (filterCourse && t.course_id !== filterCourse) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      return true;
    });

  const onDragEnd = async (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic update on full (unfiltered) column tasks
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

  const activeFilters = (filterCourse ? 1 : 0) + (filterPriority ? 1 : 0);

  return (
    <div className={styles.wrap}>
      {/* Filter / action bar */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {/* Course filter — university only */}
          {isUniversity && (
            <select
              className={styles.select}
              value={filterCourse || ''}
              onChange={(e) => setFilterCourse(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Priority filter */}
          <select
            className={styles.select}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {/* Clear filters */}
          {activeFilters > 0 && (
            <button
              className={styles.clearBtn}
              onClick={() => { setFilterCourse(null); setFilterPriority(''); }}
            >
              Clear filters
            </button>
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
              onRefresh={load}
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
