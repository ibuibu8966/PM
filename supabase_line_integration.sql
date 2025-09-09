-- ====================================
-- LINE Messaging API統合用SQL
-- ====================================

-- 1. LINEグループテーブルにLINE側のグループIDカラムを追加
ALTER TABLE line_groups 
ADD COLUMN IF NOT EXISTS line_group_id TEXT UNIQUE;

-- line_group_idにインデックスを追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_line_groups_line_group_id 
ON line_groups(line_group_id);

-- 2. 未登録タスクテーブルの作成（LINEから受信したタスク）
CREATE TABLE IF NOT EXISTS unregistered_tasks (
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

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_unregistered_tasks_line_group 
ON unregistered_tasks(line_group_id);

CREATE INDEX IF NOT EXISTS idx_unregistered_tasks_processed 
ON unregistered_tasks(processed);

CREATE INDEX IF NOT EXISTS idx_unregistered_tasks_received_at 
ON unregistered_tasks(received_at DESC);

-- 3. RLS（Row Level Security）ポリシーの設定
ALTER TABLE unregistered_tasks ENABLE ROW LEVEL SECURITY;

-- すべての操作を許可（認証なしの場合）
CREATE POLICY "Allow all operations on unregistered_tasks" 
ON unregistered_tasks
FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. 既存のLINEグループにサンプルのLINE IDを設定（テスト用）
-- ※実際のLINEグループIDに置き換えてください
-- UPDATE line_groups 
-- SET line_group_id = 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' 
-- WHERE name = 'テストグループ';

-- 5. テスト用の未登録タスクを挿入（動作確認用）
-- ※本番環境では削除してください
INSERT INTO unregistered_tasks (
    line_group_id,
    title,
    description,
    line_message_id,
    line_user_id,
    received_at
)
SELECT 
    lg.id,
    'サンプルタスク: 資料作成',
    '明日の会議用のプレゼン資料を作成する',
    'test_message_001',
    'test_user_001',
    NOW()
FROM line_groups lg
WHERE lg.name = (SELECT name FROM line_groups LIMIT 1)
LIMIT 1;

INSERT INTO unregistered_tasks (
    line_group_id,
    title,
    description,
    line_message_id,
    line_user_id,
    received_at
)
SELECT 
    lg.id,
    'サンプルタスク: メール返信',
    '〇〇さんからの見積もり依頼に返信',
    'test_message_002',
    'test_user_001',
    NOW() - INTERVAL '1 hour'
FROM line_groups lg
WHERE lg.name = (SELECT name FROM line_groups LIMIT 1)
LIMIT 1;

-- 6. 動作確認用クエリ
-- 未登録タスクの一覧を確認
SELECT 
    ut.id,
    ut.title,
    ut.description,
    lg.name as line_group_name,
    ut.received_at,
    ut.processed
FROM unregistered_tasks ut
LEFT JOIN line_groups lg ON ut.line_group_id = lg.id
ORDER BY ut.received_at DESC;

-- ====================================
-- 実行後の確認事項
-- ====================================
-- 1. unregistered_tasksテーブルが作成されていること
-- 2. line_groupsテーブルにline_group_idカラムが追加されていること
-- 3. サンプルデータが挿入されていること（テスト環境のみ）
-- 4. ダッシュボードに未登録タスクが表示されること