-- 繰り返しタスクテーブルの作成
CREATE TABLE IF NOT EXISTS recurring_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 5 CHECK (priority >= 0 AND priority <= 10),
    recurrence_type VARCHAR(50) NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
    recurrence_interval INTEGER DEFAULT 1, -- 間隔（例：2日ごと、3週間ごと）
    week_days INTEGER[], -- 週の曜日（0=日曜日, 6=土曜日）weekly の場合のみ使用
    month_day INTEGER, -- 月の日（1-31）monthly の場合のみ使用
    is_active BOOLEAN DEFAULT true,
    last_generated_at DATE, -- 最後にタスクを生成した日
    next_generation_at DATE, -- 次にタスクを生成する日
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_is_active ON recurring_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_next_generation_at ON recurring_tasks(next_generation_at);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_project_id ON recurring_tasks(project_id);

-- 生成されたタスクと繰り返しタスクの関連テーブル
CREATE TABLE IF NOT EXISTS generated_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recurring_task_id UUID NOT NULL REFERENCES recurring_tasks(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_generated_tasks_recurring_task_id ON generated_tasks(recurring_task_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_task_id ON generated_tasks(task_id);

-- RLSポリシーの設定
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tasks ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Recurring tasks are viewable by everyone" ON recurring_tasks;
DROP POLICY IF EXISTS "Recurring tasks can be created by everyone" ON recurring_tasks;
DROP POLICY IF EXISTS "Recurring tasks can be updated by everyone" ON recurring_tasks;
DROP POLICY IF EXISTS "Recurring tasks can be deleted by everyone" ON recurring_tasks;

DROP POLICY IF EXISTS "Generated tasks are viewable by everyone" ON generated_tasks;
DROP POLICY IF EXISTS "Generated tasks can be created by everyone" ON generated_tasks;
DROP POLICY IF EXISTS "Generated tasks can be deleted by everyone" ON generated_tasks;

-- recurring_tasks のポリシー
CREATE POLICY "Recurring tasks are viewable by everyone"
    ON recurring_tasks FOR SELECT
    USING (true);

CREATE POLICY "Recurring tasks can be created by everyone"
    ON recurring_tasks FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Recurring tasks can be updated by everyone"
    ON recurring_tasks FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Recurring tasks can be deleted by everyone"
    ON recurring_tasks FOR DELETE
    USING (true);

-- generated_tasks のポリシー
CREATE POLICY "Generated tasks are viewable by everyone"
    ON generated_tasks FOR SELECT
    USING (true);

CREATE POLICY "Generated tasks can be created by everyone"
    ON generated_tasks FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Generated tasks can be deleted by everyone"
    ON generated_tasks FOR DELETE
    USING (true);

-- updated_atを自動更新するトリガー
DROP TRIGGER IF EXISTS update_recurring_tasks_updated_at ON recurring_tasks;
CREATE TRIGGER update_recurring_tasks_updated_at
    BEFORE UPDATE ON recurring_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();