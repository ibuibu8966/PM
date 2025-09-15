'use client'

import { cn } from '@/lib/utils'

interface RichTextViewerProps {
  content: string
  className?: string
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  if (!content || content === '<p></p>') {
    return <p className="text-muted-foreground">（内容なし）</p>
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:mt-4 prose-headings:mb-2",
        "prose-p:my-2",
        "prose-ul:my-2 prose-ol:my-2",
        "prose-li:my-1",
        "prose-blockquote:my-2 prose-blockquote:border-l-4 prose-blockquote:pl-4",
        "prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted",
        "prose-pre:my-2 prose-pre:p-3 prose-pre:rounded-lg prose-pre:bg-muted",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}