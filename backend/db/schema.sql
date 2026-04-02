-- DanasDay database schema

CREATE TABLE IF NOT EXISTS boards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  color_label VARCHAR(20) DEFAULT '#c9b8e8',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add status_changed_at to existing tables that predate this column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#c9b8e8',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add course_id to tasks (nullable — personal tasks have no course)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;

-- Seed default boards and columns if they don't exist
INSERT INTO boards (name)
SELECT name FROM (VALUES ('University'), ('Personal')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE boards.name = v.name);

-- Seed columns for University board (includes Submitted)
INSERT INTO columns (board_id, title, position)
SELECT b.id, cols.title, cols.pos
FROM boards b
CROSS JOIN (VALUES ('To Do', 0), ('In Progress', 1), ('Done', 2), ('Submitted', 3)) AS cols(title, pos)
WHERE b.name = 'University'
  AND NOT EXISTS (
    SELECT 1 FROM columns c WHERE c.board_id = b.id AND c.title = cols.title
  );

-- Seed columns for Personal board
INSERT INTO columns (board_id, title, position)
SELECT b.id, cols.title, cols.pos
FROM boards b
CROSS JOIN (VALUES ('To Do', 0), ('In Progress', 1), ('Done', 2)) AS cols(title, pos)
WHERE b.name = 'Personal'
  AND NOT EXISTS (
    SELECT 1 FROM columns c WHERE c.board_id = b.id AND c.title = cols.title
  );
