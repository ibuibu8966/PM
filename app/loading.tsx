import { Sparkles } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <Sparkles className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  )
}