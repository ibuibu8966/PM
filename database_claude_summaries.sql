-- Claude要約テーブルの追加
-- このSQLをSupabaseのSQL Editorで実行してください

-- Claude要約テーブル
CREATE TABLE claude_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- 要約のタイトル
    summary_date DATE NOT NULL, -- 要約の日付
    content TEXT NOT NULL, -- 要約内容
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- インデックスの作成
CREATE INDEX idx_claude_summaries_customer_id ON claude_summaries(customer_id);
CREATE INDEX idx_claude_summaries_date ON claude_summaries(summary_date);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_claude_summaries_updated_at BEFORE UPDATE ON claude_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();