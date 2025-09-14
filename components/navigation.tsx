'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Home,
  FolderOpen,
  CheckSquare,
  Users,
  MessageSquare,
  Menu,
  X,
  UserCheck
} from 'lucide-react'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: Home },
    { href: '/projects', label: 'プロジェクト', icon: FolderOpen },
    { href: '/tasks', label: 'タスク', icon: CheckSquare },
    { href: '/customers', label: '顧客', icon: Users },
    { href: '/line-groups', label: 'LINEグループ', icon: MessageSquare },
    { href: '/assignees', label: '担当者別', icon: UserCheck },
  ]

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* デスクトップナビゲーション */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold">
            PM Support
          </Link>
          <div className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* モバイルナビゲーション */}
      <nav className="md:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <Link href="/dashboard" className="text-lg font-bold">
            PM Support
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isOpen && (
          <div className="absolute top-14 left-0 right-0 z-50 bg-background border-b shadow-lg">
            <div className="flex flex-col p-4 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* モバイル下部ナビゲーション */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 h-16">
        <div className="flex items-center justify-around h-full">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center h-full w-full transition-colors ${
                  isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-6 w-6" />
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}