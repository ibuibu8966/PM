'use client'

import { useState, useRef } from 'react'
import { Upload, File, Image, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/toast-context'
import { Attachment } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  projectId?: string
  taskId?: string
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
}

export function FileUpload({ projectId, taskId, attachments, onAttachmentsChange }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { showToast } = useToast()

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
    return (bytes / 1073741824).toFixed(2) + ' GB'
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newAttachments: Attachment[] = []

    try {
      for (const file of Array.from(files)) {
        // ファイルサイズチェック（100MB制限）
        if (file.size > 100 * 1024 * 1024) {
          showToast(`${file.name}は100MBを超えています`, 'error')
          continue
        }

        // Supabase Storageにアップロード
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${projectId || taskId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file)

        if (uploadError) {
          console.error('ストレージアップロードエラー:', uploadError)
          if (uploadError.message?.includes('bucket')) {
            showToast('ストレージバケットが存在しません。Supabaseの設定を確認してください', 'error')
          } else if (uploadError.message?.includes('row-level')) {
            showToast('ストレージの権限設定を確認してください', 'error')
          } else if (uploadError.message?.includes('payload too large')) {
            showToast('Supabaseのファイルサイズ上限を確認してください', 'error')
          }
          throw uploadError
        }

        // URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath)

        // データベースに保存
        const { data: attachment, error: dbError } = await supabase
          .from('attachments')
          .insert({
            filename: file.name,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            project_id: projectId || null,
            task_id: taskId || null,
            uploaded_by: 'ユーザー'
          })
          .select()
          .single()

        if (dbError) {
          console.error('データベース保存エラー:', dbError)
          // ストレージからファイルを削除
          await supabase.storage.from('attachments').remove([filePath])
          throw dbError
        }
        newAttachments.push(attachment)
      }

      onAttachmentsChange([...attachments, ...newAttachments])
      showToast('ファイルをアップロードしました', 'success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      console.error('アップロードエラー詳細:', {
        error,
        message: errorMessage
      })

      // エラーメッセージをより具体的に
      if (error instanceof Error && error.message) {
        showToast(`アップロードエラー: ${error.message}`, 'error')
      } else {
        showToast('ファイルのアップロードに失敗しました', 'error')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('このファイルを削除してもよろしいですか？')) return

    try {
      const attachment = attachments.find(a => a.id === attachmentId)
      if (!attachment) return

      // Storageから削除
      const filePath = attachment.file_url.split('/').slice(-2).join('/')
      await supabase.storage
        .from('attachments')
        .remove([filePath])

      // データベースから削除
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) throw error

      onAttachmentsChange(attachments.filter(a => a.id !== attachmentId))
      showToast('ファイルを削除しました', 'success')
    } catch (error) {
      console.error('削除エラー:', error)
      showToast('ファイルの削除に失敗しました', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          "hover:border-primary hover:bg-primary/5 cursor-pointer",
          uploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">アップロード中...</p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">クリックまたはドラッグ＆ドロップ</p>
            <p className="text-xs text-muted-foreground">最大100MBまでのファイルをアップロード</p>
          </>
        )}
      </div>

      {/* アップロード済みファイル一覧 */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">添付ファイル ({attachments.length})</h4>
          <div className="grid gap-2">
            {attachments.map((attachment) => {
              const Icon = getFileIcon(attachment.mime_type)
              return (
                <Card key={attachment.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-primary truncate block"
                        >
                          {attachment.filename}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}