import { NextRequest, NextResponse } from 'next/server'

// LINE Webhook デバッグ用エンドポイント
// グループIDを確認するために使用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== LINE Webhook Debug ===')
    console.log('Full body:', JSON.stringify(body, null, 2))
    
    interface GroupInfo {
      type: string
      userId?: string
      groupId?: string
      roomId?: string
      message?: string
    }
    
    const groupInfo: GroupInfo[] = []
    
    // イベントからグループID/ルームIDを抽出
    for (const event of body.events || []) {
      if (event.source) {
        const info: GroupInfo = {
          type: event.source.type,
          userId: event.source.userId
        }
        
        if (event.source.type === 'group') {
          info.groupId = event.source.groupId
          console.log('🔍 Group ID found:', event.source.groupId)
        } else if (event.source.type === 'room') {
          info.roomId = event.source.roomId
          console.log('🔍 Room ID found:', event.source.roomId)
        }
        
        if (event.message && event.message.type === 'text') {
          info.message = event.message.text
        }
        
        groupInfo.push(info)
      }
    }
    
    // デバッグ情報を返す
    return NextResponse.json({ 
      success: true,
      message: 'Check server logs for Group ID',
      debug: groupInfo
    })
    
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}