-- 担当者機能追加用SQLスクリプト

-- 1. 担当者テーブルの作成
CREATE TABLE IF NOT EXISTS assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. タスクテーブルに担当者IDカラムを追加
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES assignees(id) ON DELETE SET NULL;

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- 4. 担当者テーブルの更新日時自動更新トリガーを設定
CREATE TRIGGER update_assignees_updated_at BEFORE UPDATE ON assignees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. サンプルデータ（必要に応じて）
-- INSERT INTO assignees (name) VALUES
-- ('田中太郎'),
-- ('佐藤花子'),
-- ('鈴木一郎');