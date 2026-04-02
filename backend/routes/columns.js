const router = require('express').Router();
const { pool } = require('../db/pool');

// POST create column
router.post('/', async (req, res) => {
  try {
    const { board_id, title, position } = req.body;
    const result = await pool.query(
      'INSERT INTO columns (board_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [board_id, title, position ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update column title/position
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position } = req.body;
    const result = await pool.query(
      'UPDATE columns SET title = COALESCE($1, title), position = COALESCE($2, position) WHERE id = $3 RETURNING *',
      [title, position, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE column
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM columns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
