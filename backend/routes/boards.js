const router           = require('express').Router();
const { pool }         = require('../db/pool');
const requireAuth      = require('../middleware/requireAuth');
const { seedUserBoards } = require('../db/seedUser');

router.use(requireAuth);

// GET all boards for the logged-in user (seeds on first visit too)
router.get('/', async (req, res) => {
  try {
    await seedUserBoards(req.user.id); // no-op if boards exist
    const boards = await pool.query(
      'SELECT * FROM boards WHERE user_id = $1 ORDER BY id',
      [req.user.id]
    );
    res.json(boards.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single board (must belong to user)
router.get('/:id', async (req, res) => {
  try {
    const board = await pool.query(
      'SELECT * FROM boards WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!board.rows.length) return res.status(404).json({ error: 'Not found' });

    const columns = await pool.query(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position',
      [req.params.id]
    );
    for (const col of columns.rows) {
      const tasks = await pool.query(
        'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position',
        [col.id]
      );
      col.tasks = tasks.rows;
    }
    res.json({ ...board.rows[0], columns: columns.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
