// Terminal column per board — urgency stops here
const TERMINAL = {
  university: ['submitted'],
  personal:   ['done'],
};

export function isTerminalColumn(colTitle, boardName = '') {
  const key = boardName.toLowerCase();
  const list = TERMINAL[key] || ['done', 'submitted'];
  return list.includes(colTitle.toLowerCase());
}

// Returns hours until due (negative = overdue)
export function hoursUntilDue(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  due.setHours(23, 59, 59); // end of due day
  return (due - Date.now()) / 36e5;
}

// A task is urgent if due within 24h and not in the terminal column for its board
export function isUrgent(task, columnTitle, boardName) {
  if (!task.due_date) return false;
  if (isTerminalColumn(columnTitle, boardName)) return false;
  const h = hoursUntilDue(task.due_date);
  return h !== null && h <= 24;
}
