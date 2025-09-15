# Supabase Storage 設定ガイド

## ファイルアップロード上限の変更（100MBまで対応）

### 1. Supabaseダッシュボードでの設定

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 左側メニューから「Storage」をクリック
4. 「attachments」バケットを選択（存在しない場合は作成）

### 2. バケットの作成（初回のみ）

```sql
-- Supabase SQL Editorで実行
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true);
```

### 3. ストレージポリシーの設定

SQL Editorで以下を実行：

```sql
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
```

### 4. ファイルサイズ上限の設定

Supabaseのプロジェクト設定で以下を確認：

1. **Settings** → **Storage** に移動
2. **File upload limit** を `100 MB` に設定
3. 保存

> **注意**: Free tierの場合、ストレージ容量は1GBまでです。
> Pro planでは100GBまで利用可能です。

### 5. CORS設定（必要に応じて）

```json
[
  {
    "origin": ["https://pmnoda.vercel.app"],
    "allowed_headers": ["*"],
    "allowed_methods": ["GET", "POST", "PUT", "DELETE"]
  }
]
```

## トラブルシューティング

### エラー: "Payload too large"
- Supabaseのファイルアップロード上限を確認
- Vercelのデプロイ設定で`functions.maxDuration`を調整

### エラー: "new row violates row-level security policy"
- 上記のストレージポリシーが正しく設定されているか確認
- RLSが有効になっているか確認

## アプリケーション側の変更

- `components/ui/file-upload.tsx`:
  - ファイルサイズ上限を10MB→100MBに変更済み
  - ファイルサイズ表示をGB対応に改善済み