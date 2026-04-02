require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { migrate, pool } = require('./db/pool');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/boards', require('./routes/boards'));
app.use('/api/columns', require('./routes/columns'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/courses', require('./routes/courses'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;

// Delete stale tasks:
//   University > Submitted  → after 5 days
//   Personal   > Done       → after 5 days
async function cleanupStaleTasks() {
  try {
    const result = await pool.query(`
      DELETE FROM tasks t
      USING columns c, boards b
      WHERE t.column_id = c.id
        AND c.board_id  = b.id
        AND t.status_changed_at < NOW() - INTERVAL '5 days'
        AND (
          (b.name = 'University' AND c.title = 'Submitted') OR
          (b.name = 'Personal'   AND c.title = 'Done')
        )
    `);
    if (result.rowCount > 0) {
      console.log(`Cleanup: removed ${result.rowCount} stale task(s).`);
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

// Run migrations then start server
migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`DanasDay API running on port ${PORT}`));

    // Run cleanup on startup and every 24 hours
    cleanupStaleTasks();
    setInterval(cleanupStaleTasks, 24 * 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
