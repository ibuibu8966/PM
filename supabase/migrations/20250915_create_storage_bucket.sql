-- attachmentsバケットが存在しない場合は作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  104857600, -- 100MB in bytes
  NULL -- すべてのMIMEタイプを許可
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

-- ストレージポリシーの設定（既存のポリシーを削除してから作成）
DO $$
BEGIN
  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- 全ユーザーがファイルをアップロードできる
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments');

-- 全ユーザーがファイルを閲覧できる
CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- 全ユーザーがファイルを削除できる
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'attachments');

-- 全ユーザーがファイルを更新できる
CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'attachments')
WITH CHECK (bucket_id = 'attachments');