const { pool } = require('./pool');

// Creates University + Personal boards with default columns for a new user.
// Safe to call on every login — skips if boards already exist.
async function seedUserBoards(userId) {
  const existing = await pool.query('SELECT id FROM boards WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) return; // already seeded

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // University board
    const uni = await client.query(
      'INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id',
      [userId, 'University']
    );
    for (const [title, pos] of [['To Do', 0], ['In Progress', 1], ['Done', 2], ['Submitted', 3]]) {
      await client.query(
        'INSERT INTO columns (board_id, title, position) VALUES ($1, $2, $3)',
        [uni.rows[0].id, title, pos]
      );
    }

    // Personal board
    const per = await client.query(
      'INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id',
      [userId, 'Personal']
    );
    for (const [title, pos] of [['To Do', 0], ['In Progress', 1], ['Done', 2]]) {
      await client.query(
        'INSERT INTO columns (board_id, title, position) VALUES ($1, $2, $3)',
        [per.rows[0].id, title, pos]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedUserBoards };
