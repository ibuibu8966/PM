import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// LINE Webhook署名検証
function validateSignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64')
  return hash === signature
}

// メッセージをタスクとして解析
function parseTaskFromMessage(text: string): { title: string; description: string } | null {
  const lines = text.trim().split('\n')
  
  if (lines.length === 0) return null
  
  // 1行目をタイトル、2行目以降を説明として扱う
  const title = lines[0].trim()
  const description = lines.slice(1).join('\n').trim()
  
  return { title, description }
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.text()

    // LINE署名検証（本番環境では必須）
    const signature = request.headers.get('x-line-signature')
    const channelSecret = process.env.LINE_CHANNEL_SECRET

    if (channelSecret && signature) {
      const isValid = validateSignature(body, signature, channelSecret)
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // JSONパース
    const data = JSON.parse(body)

    // Supabaseクライアント作成
    const supabase = await createClient()

    // イベント処理
    for (const event of data.events) {
      // テキストメッセージのみ処理
      if (event.type === 'message' && event.message.type === 'text') {
        const messageText = event.message.text
        const lineGroupId = event.source.groupId || event.source.roomId
        const lineUserId = event.source.userId

        // タスクとして解析
        const taskData = parseTaskFromMessage(messageText)

        if (taskData) {
          // グループ名を決定（グループIDまたは個人チャット）
          const lineGroupName = lineGroupId || `個人チャット_${lineUserId}`

          // 送信者名（後でLINE Profile APIで取得可能）
          const senderName = lineUserId || 'Unknown'

          // タスク内容を結合
          const content = taskData.description
            ? `${taskData.title}\n${taskData.description}`
            : taskData.title

          // 未登録タスクとして保存
          const { error } = await supabase
            .from('unregistered_tasks')
            .insert({
              line_group_name: lineGroupName,
              content: content,
              sender_name: senderName
            })

          if (error) {
            console.error('Failed to save unregistered task:', error)
          } else {
            console.log('タスクを保存しました:', {
              group: lineGroupName,
              content: content,
              sender: senderName
            })
          }
        }
      }
    }

    // LINEサーバーに200 OKを返す
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Webhook URLの確認用
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    message: 'LINE Webhook endpoint is ready',
    webhook_url: 'https://pmnoda.vercel.app/api/webhook/line'
  })
}