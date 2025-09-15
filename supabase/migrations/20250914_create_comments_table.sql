-- コメントテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL DEFAULT 'ユーザー',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- プロジェクトかタスクのいずれかに紐付く
    CHECK (
        (project_id IS NOT NULL AND task_id IS NULL) OR
        (project_id IS NULL AND task_id IS NOT NULL)
    )
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- RLSポリシーの設定
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがコメントを読める
CREATE POLICY IF NOT EXISTS "Comments are viewable by everyone"
    ON comments FOR SELECT
    USING (true);

-- 全ユーザーがコメントを作成できる
CREATE POLICY IF NOT EXISTS "Comments can be created by everyone"
    ON comments FOR INSERT
    WITH CHECK (true);

-- 全ユーザーがコメントを更新できる
CREATE POLICY IF NOT EXISTS "Comments can be updated by everyone"
    ON comments FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 全ユーザーがコメントを削除できる
CREATE POLICY IF NOT EXISTS "Comments can be deleted by everyone"
    ON comments FOR DELETE
    USING (true);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();