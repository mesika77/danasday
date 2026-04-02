const router = require('express').Router();
const { pool } = require('../db/pool');

// GET all boards (with their columns and tasks)
router.get('/', async (req, res) => {
  try {
    const boards = await pool.query('SELECT * FROM boards ORDER BY id');
    res.json(boards.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single board with columns + tasks
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const columns = await pool.query(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position',
      [id]
    );
    for (const col of columns.rows) {
      const tasks = await pool.query(
        'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position',
        [col.id]
      );
      col.tasks = tasks.rows;
    }
    const board = await pool.query('SELECT * FROM boards WHERE id = $1', [id]);
    res.json({ ...board.rows[0], columns: columns.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
