-- 通知テーブルの作成
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('task_deadline', 'task_overdue', 'task_assigned', 'comment_added', 'status_changed', 'priority_changed', 'general')),
  is_read BOOLEAN DEFAULT FALSE,
  related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  recipient VARCHAR(255), -- 受信者（将来の複数ユーザー対応用）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- プロジェクトまたはタスクに関連付けられる
  CONSTRAINT notification_relation CHECK (
    (related_project_id IS NOT NULL AND related_task_id IS NULL) OR
    (related_project_id IS NULL AND related_task_id IS NOT NULL) OR
    (related_project_id IS NULL AND related_task_id IS NULL)
  )
);

-- インデックスの作成
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_project ON notifications(related_project_id);
CREATE INDEX idx_notifications_task ON notifications(related_task_id);
CREATE INDEX idx_notifications_type ON notifications(type);

-- RLSを有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成（現在は全アクセス許可）
CREATE POLICY "Enable all access for notifications" ON notifications
  FOR ALL USING (true) WITH CHECK (true);

-- 通知設定テーブル（オプション）
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255), -- 将来のユーザー識別用
  task_deadline_enabled BOOLEAN DEFAULT TRUE,
  task_overdue_enabled BOOLEAN DEFAULT TRUE,
  task_assigned_enabled BOOLEAN DEFAULT TRUE,
  comment_added_enabled BOOLEAN DEFAULT TRUE,
  status_changed_enabled BOOLEAN DEFAULT TRUE,
  priority_changed_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON notification_settings
FOR EACH ROW
EXECUTE FUNCTION update_notification_settings_updated_at();