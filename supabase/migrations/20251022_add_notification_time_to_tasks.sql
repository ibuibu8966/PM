-- タスクに通知時刻カラムを追加
-- notification_time: タスクの再確認通知日時（必須）

-- 1. notification_timeカラムを追加（一時的にNULL許可）
ALTER TABLE tasks
ADD COLUMN notification_time TIMESTAMP WITH TIME ZONE;

-- 2. 既存データに明日の9時を設定
UPDATE tasks
SET notification_time = (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '9 hours')
WHERE notification_time IS NULL;

-- 3. NOT NULL制約を追加
ALTER TABLE tasks
ALTER COLUMN notification_time SET NOT NULL;

-- 4. notification_timeのインデックスを作成（通知一覧取得の高速化）
CREATE INDEX idx_tasks_notification_time ON tasks(notification_time);

-- 5. 通知時刻が未来であることを確認するチェック制約（オプション）
-- 注: この制約は編集時に過去の日時をチェックするアプリケーション側のロジックと併用
ALTER TABLE tasks
ADD CONSTRAINT check_notification_time_exists CHECK (notification_time IS NOT NULL);
