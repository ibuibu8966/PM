'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineGroup } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card-detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit2, Trash2, X, MessageSquare, Copy, Check } from 'lucide-react'
import Link from 'next/link'

export default function LineGroupsPage() {
  const [lineGroups, setLineGroups] = useState<LineGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroup, setEditingGroup] = useState<LineGroup | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchLineGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchLineGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('line_groups')
        .select('*')
        .order('name')

      if (error) throw error
      setLineGroups(data || [])
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLineGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      const { data, error } = await supabase
        .from('line_groups')
        .insert({ name: newGroupName.trim() })
        .select()
        .single()

      if (error) throw error
      
      setLineGroups([...lineGroups, data])
      setNewGroupName('')
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('LINEグループ追加エラー:', error)
      alert('LINEグループの追加に失敗しました')
    }
  }

  const handleUpdateLineGroup = async () => {
    if (!editingGroup || !editingGroup.name.trim()) return

    try {
      const { error } = await supabase
        .from('line_groups')
        .update({ name: editingGroup.name.trim() })
        .eq('id', editingGroup.id)

      if (error) throw error
      
      setLineGroups(lineGroups.map(lg => 
        lg.id === editingGroup.id ? editingGroup : lg
      ))
      setEditingGroup(null)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('LINEグループ更新エラー:', error)
      alert('LINEグループの更新に失敗しました')
    }
  }

  const handleDeleteLineGroup = async (id: string) => {
    if (!confirm('このLINEグループを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('line_groups')
        .delete()
        .eq('id', id)

      if (error) throw error

      setLineGroups(lineGroups.filter(lg => lg.id !== id))
    } catch (error) {
      console.error('LINEグループ削除エラー:', error)
      alert('LINEグループの削除に失敗しました。関連するプロジェクトがある可能性があります。')
    }
  }

  const handleCopyName = async (lineGroup: LineGroup) => {
    try {
      await navigator.clipboard.writeText(lineGroup.name)
      setCopiedId(lineGroup.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('コピーエラー:', error)
      alert('クリップボードへのコピーに失敗しました')
    }
  }

  const filteredLineGroups = lineGroups.filter(lineGroup =>
    lineGroup.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center items-center h-screen">読み込み中...</div>
  }

  return (
    <div className="container mx-auto p-3 max-w-6xl">
      <div className="mb-2 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold mb-2">LINEグループ管理</h1>
          <p className="text-muted-foreground">LINEグループ情報を管理</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規グループ
        </Button>
      </div>

      {/* 検索バー */}
      <Card className="mb-3">
        <CardContent className="pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="LINEグループを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* LINEグループリスト */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredLineGroups.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'LINEグループが見つかりません' : 'LINEグループが登録されていません'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLineGroups.map((lineGroup) => (
            <HoverCard key={lineGroup.id}>
              <HoverCardTrigger asChild>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="p-2">
                    <div className="flex justify-between items-start">
                      <Link href={`/line-groups/${lineGroup.id}`} className="flex-1">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <CardTitle className="text-base hover:text-primary cursor-pointer transition-colors line-clamp-2">
                            {lineGroup.name}
                          </CardTitle>
                        </div>
                      </Link>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleCopyName(lineGroup)}
                          title="グループ名をコピー"
                        >
                          {copiedId === lineGroup.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingGroup(lineGroup)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDeleteLineGroup(lineGroup.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-2 pb-4">
                    <p className="text-xs text-muted-foreground">
                      {new Date(lineGroup.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </CardContent>
                </Card>
              </HoverCardTrigger>
              <HoverCardContent className="w-80" align="start">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-base font-semibold break-words">{lineGroup.name}</h4>
                      <p className="text-sm text-muted-foreground mt-2">
                        作成日: {new Date(lineGroup.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyName(lineGroup)}
                      className="flex-1"
                    >
                      {copiedId === lineGroup.id ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-green-600" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          グループ名をコピー
                        </>
                      )}
                    </Button>
                    <Link href={`/line-groups/${lineGroup.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        詳細を見る
                      </Button>
                    </Link>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))
        )}
      </div>

      {/* 新規追加ダイアログ */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>新規LINEグループ追加</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setNewGroupName('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="groupName">グループ名</Label>
                  <Input
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="LINEグループ名を入力"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLineGroup()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddLineGroup} className="flex-1">
                    追加
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setNewGroupName('')
                    }}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 編集ダイアログ */}
      {isEditDialogOpen && editingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>LINEグループ編集</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingGroup(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="editGroupName">グループ名</Label>
                  <Input
                    id="editGroupName"
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup({
                      ...editingGroup,
                      name: e.target.value
                    })}
                    placeholder="LINEグループ名を入力"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateLineGroup()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateLineGroup} className="flex-1">
                    更新
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false)
                      setEditingGroup(null)
                    }}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}