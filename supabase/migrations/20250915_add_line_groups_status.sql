-- LINEグループテーブルにis_activeカラムを追加
ALTER TABLE line_groups
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_line_groups_is_active ON line_groups(is_active);

-- 既存のレコードはすべて有効に設定
UPDATE line_groups SET is_active = true WHERE is_active IS NULL;