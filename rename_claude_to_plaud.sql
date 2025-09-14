-- Claude要約テーブルをPlaud要約テーブルにリネーム
-- Supabase SQL Editorで実行してください

-- 1. テーブル名の変更
ALTER TABLE IF EXISTS claude_summaries RENAME TO plaud_summaries;

-- 2. トリガー名の変更
DROP TRIGGER IF EXISTS update_claude_summaries_updated_at ON plaud_summaries;

CREATE TRIGGER update_plaud_summaries_updated_at BEFORE UPDATE ON plaud_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. インデックス名の変更
DROP INDEX IF EXISTS idx_claude_summaries_customer_id;
DROP INDEX IF EXISTS idx_claude_summaries_date;

CREATE INDEX idx_plaud_summaries_customer_id ON plaud_summaries(customer_id);
CREATE INDEX idx_plaud_summaries_date ON plaud_summaries(summary_date);

-- 確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%summaries%'
ORDER BY table_name;