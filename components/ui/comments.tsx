'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Send, Edit2, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/toast-context'
import { Comment } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface CommentsProps {
  projectId?: string
  taskId?: string
}

export function Comments({ projectId, taskId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const { showToast } = useToast()

  useEffect(() => {
    fetchComments()
    // リアルタイム更新の設定
    const channel = supabase
      .channel('comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: projectId ? `project_id=eq.${projectId}` : `task_id=eq.${taskId}`
      }, () => {
        fetchComments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, taskId])

  const fetchComments = async () => {
    try {
      const query = supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query.eq('project_id', projectId)
      } else if (taskId) {
        query.eq('task_id', taskId)
      }

      const { data, error } = await query

      if (error) {
        console.error('コメント取得エラー詳細:', {
          error,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })

        // テーブルが存在しない場合のメッセージ
        if (error.code === '42P01' || error.message?.includes('relation "comments" does not exist')) {
          showToast('コメント機能の初期化が必要です。管理者にお問い合わせください。', 'error')
        } else {
          showToast(`コメントの取得に失敗しました: ${error.message}`, 'error')
        }

        // エラーでも空の配列を設定してUIを表示
        setComments([])
      } else {
        setComments(data || [])
      }
    } catch (error) {
      console.error('予期しないエラー:', error)
      showToast('予期しないエラーが発生しました', 'error')
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          project_id: projectId || null,
          task_id: taskId || null,
          author_name: 'ユーザー'
        })
        .select()
        .single()

      if (error) throw error

      setComments([data, ...comments])
      setNewComment('')
      showToast('コメントを投稿しました', 'success')
    } catch (error) {
      console.error('コメント投稿エラー:', error)
      showToast('コメントの投稿に失敗しました', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.map(c =>
        c.id === commentId ? { ...c, content: editContent.trim() } : c
      ))
      setEditingComment(null)
      setEditContent('')
      showToast('コメントを更新しました', 'success')
    } catch (error) {
      console.error('コメント更新エラー:', error)
      showToast('コメントの更新に失敗しました', 'error')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('このコメントを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(c => c.id !== commentId))
      showToast('コメントを削除しました', 'success')
    } catch (error) {
      console.error('コメント削除エラー:', error)
      showToast('コメントの削除に失敗しました', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        コメント ({comments.length})
      </h3>

      {/* コメント投稿フォーム */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="コメントを入力..."
          className="min-h-[100px]"
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting || !newComment.trim()}>
          {submitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              投稿中...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              コメントを投稿
            </>
          )}
        </Button>
      </form>

      {/* コメント一覧 */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <Card className="p-6 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">まだコメントがありません</p>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{comment.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ja
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingComment(comment.id)
                      setEditContent(comment.content)
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(comment.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {editingComment === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(comment.id)}
                      disabled={!editContent.trim()}
                    >
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingComment(null)
                        setEditContent('')
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}