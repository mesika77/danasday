const router      = require('express').Router();
const { pool }    = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM courses WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    const result = await pool.query(
      'INSERT INTO courses (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, color || '#c9b8e8']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    const result = await pool.query(
      `UPDATE courses SET name = COALESCE($1, name), color = COALESCE($2, color)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [name, color, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
