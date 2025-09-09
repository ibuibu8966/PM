-- Claude要約テーブルの追加（完全版）
-- このSQLをSupabaseのSQL Editorで実行してください

-- 更新日時を自動更新するトリガー関数（既に存在する場合はスキップされます）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Claude要約テーブル（既に存在する場合は削除してから作成）
DROP TABLE IF EXISTS claude_summaries CASCADE;

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

-- 権限の設定（Supabaseのデフォルト設定）
GRANT ALL ON claude_summaries TO postgres;
GRANT ALL ON claude_summaries TO anon;
GRANT ALL ON claude_summaries TO authenticated;
GRANT ALL ON claude_summaries TO service_role;

-- テスト用のサンプルデータ（オプション - 不要な場合はコメントアウト）
-- INSERT INTO claude_summaries (customer_id, title, summary_date, content)
-- SELECT 
--     id,
--     'サンプル要約',
--     CURRENT_DATE,
--     'これはテスト用のClaude要約サンプルです。実際の要約内容をここに記載します。'
-- FROM customers
-- LIMIT 1;