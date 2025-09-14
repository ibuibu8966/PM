# LINE Messaging API セットアップガイド

## 1. LINE Developersでの設定

### アカウント作成
1. https://developers.line.biz/ にアクセス
2. LINEアカウントでログイン
3. 初回は開発者情報を登録

### Messaging APIチャネル作成
1. 「新規チャネル作成」をクリック
2. 「Messaging API」を選択
3. 以下の情報を入力：
   - **プロバイダー名**: PM Support（任意）
   - **チャネル名**: PM Support Bot
   - **チャネル説明**: タスク管理ボット
   - **大業種/小業種**: 適当に選択
   - **メールアドレス**: あなたのメール

### 必要な情報を取得
チャネル作成後、以下の情報をコピーしてください：

1. **Channel Secret**
   - Basic settings タブ
   - Channel secret の項目

2. **Channel Access Token**
   - Messaging API タブ
   - 「Issue」ボタンをクリックして発行

3. **Your User ID**（テスト用）
   - Basic settings タブ
   - Your user ID の項目

## 2. 環境変数の設定

### ローカル開発環境（.env.local）
```env
# LINE Messaging API
LINE_CHANNEL_SECRET=ここにChannel Secretを貼り付け
LINE_CHANNEL_ACCESS_TOKEN=ここにChannel Access Tokenを貼り付け
```

### Vercel環境変数
1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下を追加：
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ACCESS_TOKEN`

## 3. Webhook URLの設定

LINE Developersコンソールで：
1. Messaging API タブを開く
2. Webhook settings で以下を設定：
   - **Webhook URL**: `https://pmnoda.vercel.app/api/webhook/line`
   - **Use webhook**: ON
   - **Verify**: クリックして接続確認
3. Line Official Account features：
   - **Auto-reply messages**: OFF
   - **Greeting messages**: OFF

## 4. LINE公式アカウントと友だちになる

1. Messaging API タブの QRコード をスキャン
2. または LINE ID で検索して友だち追加

## 5. 使い方

LINEでボットにメッセージを送信：
```
タスクのタイトル
タスクの詳細説明（オプション）
```

例：
```
会議資料作成
明日の定例会議用の資料を準備する
```

## 6. テスト方法

### Webhook動作確認
```bash
curl https://pmnoda.vercel.app/api/webhook/line
```

### ローカルでのテスト
```bash
curl -X POST http://localhost:3000/api/webhook/line/test \
  -H "Content-Type: application/json" \
  -d '{
    "title": "テストタスク",
    "description": "これはテストです"
  }'
```

## トラブルシューティング

### Webhookが動作しない場合
- Webhook URLが正しいか確認
- 環境変数が設定されているか確認
- Vercelのログを確認

### メッセージが保存されない場合
- Supabaseの`unregistered_tasks`テーブルが存在するか確認
- Supabaseの接続設定を確認

## セキュリティ注意事項

- Channel SecretとAccess Tokenは絶対に公開しない
- GitHubにコミットしない（.env.localは.gitignoreに含まれています）
- 本番環境では必ず署名検証を有効にする