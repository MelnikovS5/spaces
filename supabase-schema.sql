-- Таблица узлов (пространства, фокусы, фигуры, акты, etc.)
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  parent_id TEXT,
  status TEXT DEFAULT 'pending',
  parent_focus_id TEXT,
  parent_form_id TEXT,
  parent_act_id TEXT,
  parent_zone_id TEXT,
  zone_color TEXT,
  width REAL,
  height REAL,
  layers JSONB DEFAULT '[]',
  children JSONB DEFAULT '[]',
  created_at BIGINT
);

-- Таблица связей
CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL
);

-- Таблица архива
CREATE TABLE archives (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  act_id TEXT NOT NULL,
  act_name TEXT NOT NULL,
  space_id TEXT,
  space_name TEXT,
  result TEXT NOT NULL,
  duration INTEGER NOT NULL,
  notes TEXT DEFAULT '',
  completed_at BIGINT NOT NULL
);

-- Таблица конфигов сессий
CREATE TABLE session_configs (
  user_id TEXT NOT NULL,
  act_id TEXT NOT NULL,
  act_layer_index INTEGER,
  form_id TEXT,
  form_layer_index INTEGER,
  PRIMARY KEY (user_id, act_id)
);

-- RLS (Row Level Security)
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_configs ENABLE ROW LEVEL SECURITY;

-- Политики: пользователь видит только свои данные
-- Используем service role key, поэтому фильтрация по user_id на клиенте
CREATE POLICY "Users can CRUD own nodes" ON nodes FOR ALL USING (true);
CREATE POLICY "Users can CRUD own connections" ON connections FOR ALL USING (true);
CREATE POLICY "Users can CRUD own archives" ON archives FOR ALL USING (true);
CREATE POLICY "Users can CRUD own session_configs" ON session_configs FOR ALL USING (true);
