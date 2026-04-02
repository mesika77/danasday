require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const passport     = require('passport');
const { migrate, pool } = require('./db/pool');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/auth',         require('./routes/auth'));
app.use('/api/boards',   require('./routes/boards'));
app.use('/api/columns',  require('./routes/columns'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/courses',  require('./routes/courses'));
app.use('/api/calendar', require('./routes/calendar'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;

async function cleanupStaleTasks() {
  try {
    const result = await pool.query(`
      DELETE FROM tasks t
      USING columns c, boards b
      WHERE t.column_id = c.id AND c.board_id = b.id
        AND t.status_changed_at < NOW() - INTERVAL '5 days'
        AND (
          (b.name = 'University' AND c.title = 'Submitted') OR
          (b.name = 'Personal'   AND c.title = 'Done')
        )
    `);
    if (result.rowCount > 0) console.log(`Cleanup: removed ${result.rowCount} stale task(s).`);
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`DanasDay API running on port ${PORT}`));
    cleanupStaleTasks();
    setInterval(cleanupStaleTasks, 24 * 60 * 60 * 1000);
  })
  .catch((err) => { console.error('Migration failed:', err); process.exit(1); });
