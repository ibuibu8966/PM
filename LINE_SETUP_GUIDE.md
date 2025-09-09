# LINE Messaging API セットアップガイド

## 1. LINE グループIDの確認方法

LINE グループIDは、Webhookでメッセージを受信した際に自動的に取得されますが、手動で確認する方法もいくつかあります。

### 方法1: Webhook経由で自動取得（推奨）

1. まず、LINE Developers ConsoleでWebhookを設定
2. グループにBotを招待
3. グループでメッセージを送信
4. Webhookで受信したデータからグループIDを取得

### 方法2: LINE Developers Consoleでテスト

1. [LINE Developers Console](https://developers.line.biz/)にログイン
2. プロバイダーとチャネルを選択
3. 「Messaging API設定」タブを開く
4. 「Webhook設定」でWebhook URLを設定：
   ```
   https://your-domain.vercel.app/api/webhook/line
   ```
5. 「検証」ボタンでWebhookの接続をテスト

### 方法3: デバッグ用エンドポイントを作成

以下のファイルを作成して、グループIDを確認できます：

```typescript
// app/api/webhook/line/debug/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Webhookイベントをログ出力
  console.log('=== LINE Webhook Debug ===')
  console.log(JSON.stringify(body, null, 2))
  
  // グループIDを抽出
  for (const event of body.events) {
    if (event.source.type === 'group') {
      console.log('Group ID:', event.source.groupId)
    } else if (event.source.type === 'room') {
      console.log('Room ID:', event.source.roomId)
    }
  }
  
  return NextResponse.json({ success: true })
}
```

## 2. LINE Messaging API 設定手順

### Step 1: LINE Developers アカウント作成

1. [LINE Developers](https://developers.line.biz/)にアクセス
2. LINEアカウントでログイン
3. 開発者アカウントを作成

### Step 2: プロバイダーとチャネル作成

1. **新規プロバイダー作成**
   - 「プロバイダー作成」をクリック
   - プロバイダー名を入力（例：「PM Support Tool」）

2. **Messaging APIチャネル作成**
   - 「新規チャネル作成」→「Messaging API」を選択
   - 必要情報を入力：
     - チャネル名：PM Support Bot
     - チャネル説明：タスク管理用Bot
     - 大業種・小業種：適切なものを選択
     - メールアドレス：連絡先メールアドレス

### Step 3: チャネル設定

1. **基本設定**
   - チャネルシークレット：`.env.local`にコピー
   ```
   LINE_CHANNEL_SECRET=your_channel_secret_here
   ```

2. **Messaging API設定**
   - Webhook URL：
   ```
   https://your-domain.vercel.app/api/webhook/line
   ```
   - Webhookの利用：ON
   - 応答メッセージ：OFF（自動応答を無効化）

3. **チャネルアクセストークン**
   - 「チャネルアクセストークン」を発行
   - `.env.local`に追加：
   ```
   LINE_CHANNEL_ACCESS_TOKEN=your_access_token_here
   ```

### Step 4: Botをグループに追加

1. **QRコードでBot追加**
   - Messaging API設定ページのQRコードをLINEで読み取り
   - Botを友だち追加

2. **グループに招待**
   - LINEグループを開く
   - 「メンバー追加」→ Botを選択
   - グループに招待

### Step 5: グループIDの取得と設定

1. **グループでテストメッセージ送信**
   ```
   テストタスク
   これはテスト用の説明です
   ```

2. **Vercelのログを確認**
   - Vercel Dashboardでプロジェクトを開く
   - Functions → LogsでグループIDを確認

3. **SupabaseでグループIDを更新**
   ```sql
   UPDATE line_groups 
   SET line_group_id = 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
   WHERE name = 'プロジェクトA グループ';
   ```

## 3. 環境変数の設定

### ローカル開発（.env.local）

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# LINE Messaging API
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
```

### Vercel（環境変数）

1. Vercel Dashboardでプロジェクトを開く
2. Settings → Environment Variables
3. 上記の環境変数を追加

## 4. 動作確認

### テスト手順

1. **LINEグループでメッセージ送信**
   ```
   議事録作成
   今日の会議の議事録をまとめる
   ```

2. **ダッシュボード確認**
   - ブラウザでダッシュボードを開く
   - 「未登録タスク」セクションに表示されることを確認

3. **タスク登録**
   - 「登録」ボタンをクリック
   - タスク詳細画面で情報を補完
   - プロジェクト、優先度、期限を設定

## 5. トラブルシューティング

### Webhookが動作しない場合

1. **SSL証明書の確認**
   - HTTPSでアクセス可能か確認
   - Vercelは自動でSSL対応

2. **署名検証の一時無効化**（開発時のみ）
   ```typescript
   // app/api/webhook/line/route.ts
   // 署名検証をコメントアウト
   /*
   if (channelSecret && signature) {
     const isValid = validateSignature(body, signature, channelSecret)
     if (!isValid) {
       return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
     }
   }
   */
   ```

3. **ログの確認**
   - Vercel Functions Logs
   - Supabase Logs
   - ブラウザのコンソール

### グループIDが取得できない場合

1. **Botの権限確認**
   - グループメンバーとして追加されているか
   - グループメッセージの読み取り権限があるか

2. **Webhook URLの確認**
   - 正しいURLが設定されているか
   - Webhookが有効になっているか

## 6. セキュリティ注意事項

1. **本番環境では必ず署名検証を有効化**
2. **アクセストークンは絶対に公開しない**
3. **定期的にトークンを再発行**
4. **不要なログ出力は削除**

---

## サポート

問題が発生した場合は、以下を確認してください：

- [LINE Messaging API ドキュメント](https://developers.line.biz/ja/docs/messaging-api/)
- [Next.js API Routes ドキュメント](https://nextjs.org/docs/api-routes/introduction)
- [Supabase ドキュメント](https://supabase.com/docs)