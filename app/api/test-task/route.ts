import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// テスト用エンドポイント
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { title, description, groupName = 'テストグループ' } = data

    if (!title) {
      return NextResponse.json(
        { error: 'タイトルは必須です' },
        { status: 400 }
      )
    }

    // タスク内容を結合
    const content = description
      ? `${title}\n${description}`
      : title

    // Supabaseクライアント作成
    const supabase = await createClient()

    // 未登録タスクとして保存
    const { data: task, error } = await supabase
      .from('unregistered_tasks')
      .insert({
        line_group_name: groupName,
        content: content,
        sender_name: 'テストユーザー'
      })
      .select()
      .single()

    if (error) {
      console.error('タスク保存エラー:', error)
      return NextResponse.json(
        { error: 'タスクの保存に失敗しました', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'テストタスクを作成しました',
      task: task
    })

  } catch (error) {
    console.error('テストエンドポイントエラー:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}

// 使い方の説明
export async function GET() {
  return NextResponse.json({
    message: 'テスト用タスク作成エンドポイント',
    usage: {
      method: 'POST',
      url: '/api/test-task',
      body: {
        title: 'タスクのタイトル（必須）',
        description: 'タスクの説明（オプション）',
        groupName: 'グループ名（オプション、デフォルト: テストグループ）'
      },
      example: {
        title: '会議資料作成',
        description: '明日の定例会議用の資料を準備する',
        groupName: '営業チーム'
      }
    }
  })
}