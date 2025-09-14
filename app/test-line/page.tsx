'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestLinePage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupName, setGroupName] = useState('テストグループ')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const sendTestTask = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          groupName
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // フォームをリセット
        setTitle('')
        setDescription('')
      }
    } catch (error) {
      setResult({ error: 'リクエストに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">LINE タスク テスト</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>テストタスクを作成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">タスク名（1行目）</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="会議資料作成"
            />
          </div>

          <div>
            <Label htmlFor="description">説明（2行目以降）</Label>
            <textarea
              id="description"
              className="w-full p-2 border rounded-md min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="明日の定例会議用の資料を準備する"
            />
          </div>

          <div>
            <Label htmlFor="groupName">グループ名</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="テストグループ"
            />
          </div>

          <Button
            onClick={sendTestTask}
            disabled={!title || loading}
            className="w-full"
          >
            {loading ? '送信中...' : 'テストタスクを送信'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle>{result.success ? '成功' : 'エラー'}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.success && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  タスクが作成されました！以下のページで確認できます：
                </p>
                <div className="flex gap-2">
                  <a href="/dashboard" target="_blank">
                    <Button variant="outline" size="sm">
                      ダッシュボード
                    </Button>
                  </a>
                  <a href="/unregistered-tasks" target="_blank">
                    <Button variant="outline" size="sm">
                      未登録タスク管理
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">LINEでの使い方</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>LINE公式アカウントと友だちになる</li>
          <li>メッセージを送信（1行目：タスク名、2行目以降：説明）</li>
          <li>ダッシュボードで未登録タスクを確認</li>
          <li>プロジェクトに割り当てて正式なタスクとして登録</li>
        </ol>
      </div>
    </div>
  )
}