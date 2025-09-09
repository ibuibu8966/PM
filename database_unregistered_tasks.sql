-- 未登録タスクテーブル（LINEから受信したタスク）
CREATE TABLE unregistered_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_group_id UUID REFERENCES line_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    line_message_id TEXT, -- LINE側のメッセージID
    line_user_id TEXT, -- 送信者のLINE ID
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE, -- タスクとして登録済みかどうか
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_unregistered_tasks_line_group ON unregistered_tasks(line_group_id);
CREATE INDEX idx_unregistered_tasks_processed ON unregistered_tasks(processed);
CREATE INDEX idx_unregistered_tasks_received_at ON unregistered_tasks(received_at DESC);

-- RLSポリシー
ALTER TABLE unregistered_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on unregistered_tasks" ON unregistered_tasks
    FOR ALL USING (true);