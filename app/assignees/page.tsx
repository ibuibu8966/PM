'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit2 } from 'lucide-react'

type Assignee = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export default function AssigneesPage() {
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [newAssigneeName, setNewAssigneeName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssignees()
  }, [])

  const fetchAssignees = async () => {
    try {
      const { data, error } = await supabase
        .from('assignees')
        .select('*')
        .order('name')

      if (error) throw error
      setAssignees(data || [])
    } catch (error) {
      console.error('Error fetching assignees:', error)
    } finally {
      setLoading(false)
    }
  }

  const addAssignee = async () => {
    if (!newAssigneeName.trim()) return

    try {
      const { data, error } = await supabase
        .from('assignees')
        .insert({ name: newAssigneeName })
        .select()
        .single()

      if (error) throw error

      setAssignees([...assignees, data])
      setNewAssigneeName('')
    } catch (error) {
      console.error('Error adding assignee:', error)
    }
  }

  const updateAssignee = async (id: string) => {
    if (!editingName.trim()) return

    try {
      const { error } = await supabase
        .from('assignees')
        .update({ name: editingName })
        .eq('id', id)

      if (error) throw error

      setAssignees(assignees.map(a =>
        a.id === id ? { ...a, name: editingName } : a
      ))
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      console.error('Error updating assignee:', error)
    }
  }

  const deleteAssignee = async (id: string) => {
    if (!confirm('この担当者を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('assignees')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAssignees(assignees.filter(a => a.id !== id))
    } catch (error) {
      console.error('Error deleting assignee:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">担当者管理</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>新しい担当者を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="担当者名を入力"
              value={newAssigneeName}
              onChange={(e) => setNewAssigneeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAssignee()}
            />
            <Button onClick={addAssignee}>
              <Plus className="h-4 w-4 mr-1" />
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>担当者一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {assignees.length === 0 ? (
            <p className="text-gray-500">担当者が登録されていません</p>
          ) : (
            <div className="space-y-2">
              {assignees.map((assignee) => (
                <div
                  key={assignee.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  {editingId === assignee.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateAssignee(assignee.id)
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => updateAssignee(assignee.id)}
                      >
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                      >
                        キャンセル
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{assignee.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(assignee.id)
                            setEditingName(assignee.name)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteAssignee(assignee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}