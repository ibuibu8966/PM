-- メモテーブルの作成
CREATE TABLE IF NOT EXISTS memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT memos_check CHECK (
    (project_id IS NOT NULL AND task_id IS NULL) OR
    (project_id IS NULL AND task_id IS NOT NULL)
  )
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_memos_project_id ON memos(project_id);
CREATE INDEX IF NOT EXISTS idx_memos_task_id ON memos(task_id);
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at DESC);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON memos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) を有効化
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成（すべてのユーザーがアクセス可能）
CREATE POLICY "Allow all operations on memos" ON memos
  FOR ALL
  USING (true)
  WITH CHECK (true);