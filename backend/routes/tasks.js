const router = require('express').Router();
const { pool } = require('../db/pool');

// GET tasks for a column
router.get('/column/:columnId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position',
      [req.params.columnId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create task
router.post('/', async (req, res) => {
  try {
    const { column_id, title, description, due_date, priority, color_label, position, course_id } = req.body;
    const result = await pool.query(
      `INSERT INTO tasks (column_id, title, description, due_date, priority, color_label, position, course_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [column_id, title, description, due_date || null, priority || 'medium', color_label || '#c9b8e8', position ?? 0, course_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH bulk reorder — MUST be before /:id so Express doesn't match "reorder" as an id
router.patch('/reorder', async (req, res) => {
  try {
    const { tasks } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of tasks) {
        await client.query(
          `UPDATE tasks SET column_id = $1, position = $2,
           status_changed_at = CASE WHEN column_id <> $1 THEN NOW() ELSE status_changed_at END
           WHERE id = $3`,
          [t.column_id, t.position, t.id]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update single task
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, priority, color_label, position, column_id, course_id } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET
        title             = COALESCE($1, title),
        description       = COALESCE($2, description),
        due_date          = COALESCE($3, due_date),
        priority          = COALESCE($4, priority),
        color_label       = COALESCE($5, color_label),
        position          = COALESCE($6, position),
        column_id         = COALESCE($7, column_id),
        course_id         = CASE WHEN $9 THEN NULL ELSE COALESCE($8, course_id) END,
        status_changed_at = CASE WHEN $7 IS NOT NULL AND $7 <> column_id THEN NOW() ELSE status_changed_at END
       WHERE id = $10 RETURNING *`,
      [title, description, due_date, priority, color_label, position, column_id, course_id, course_id === null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
