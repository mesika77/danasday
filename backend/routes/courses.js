const router = require('express').Router();
const { pool } = require('../db/pool');

// GET all courses
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courses ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create course
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    const result = await pool.query(
      'INSERT INTO courses (name, color) VALUES ($1, $2) RETURNING *',
      [name, color || '#c9b8e8']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update course
router.patch('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    const result = await pool.query(
      `UPDATE courses SET
        name  = COALESCE($1, name),
        color = COALESCE($2, color)
       WHERE id = $3 RETURNING *`,
      [name, color, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE course (tasks keep their data, course_id becomes null)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
