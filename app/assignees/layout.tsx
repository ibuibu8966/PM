'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserCheck, Settings } from 'lucide-react'

export default function AssigneesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const tabs = [
    { href: '/assignees/tasks', label: 'タスク一覧', icon: UserCheck },
    { href: '/assignees/manage', label: '担当者管理', icon: Settings },
  ]

  const isActive = (href: string) => {
    return pathname === href
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">担当者別管理</h1>

        {/* タブナビゲーション */}
        <div className="flex gap-2 border-b pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Link key={tab.href} href={tab.href}>
                <Button
                  variant={isActive(tab.href) ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}