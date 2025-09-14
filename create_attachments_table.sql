-- ファイル添付テーブルの作成
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT attachments_check CHECK (
    (project_id IS NOT NULL AND task_id IS NULL) OR
    (project_id IS NULL AND task_id IS NOT NULL)
  )
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC);

-- Row Level Security (RLS) を有効化
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成（すべてのユーザーがアクセス可能）
CREATE POLICY "Allow all operations on attachments" ON attachments
  FOR ALL
  USING (true)
  WITH CHECK (true);