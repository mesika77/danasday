require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const passport     = require('passport');
const { migrate, pool } = require('./db/pool');

const app = express();

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://danasday.up.railway.app',
  'https://frontend-production-046d.up.railway.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
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
        AND (
          (b.name = 'University' AND c.title = 'Submitted') OR
          (b.name = 'Personal'   AND c.title = 'Done')
        )
        AND (
          (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) OR
          (t.due_date IS NULL     AND t.status_changed_at < NOW() - INTERVAL '5 days')
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
