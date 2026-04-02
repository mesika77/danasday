import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import styles from './Column.module.css';

export default function Column({ column, courseMap = {}, onAddTask, onEditTask }) {
  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <span className={styles.title}>{column.title}</span>
        <span className={styles.count}>{column.tasks.length}</span>
      </div>

      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${styles.list} ${snapshot.isDraggingOver ? styles.over : ''}`}
          >
            {column.tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    style={prov.draggableProps.style}
                  >
                    <TaskCard
                      task={task}
                      isDragging={snap.isDragging}
                      course={task.course_id ? courseMap[task.course_id] : null}
                      onEdit={() => onEditTask(task)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <button className={styles.addBtn} onClick={onAddTask}>
        + Add task
      </button>
    </div>
  );
}
