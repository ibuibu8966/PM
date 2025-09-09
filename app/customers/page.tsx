'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import Link from 'next/link'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({ name: newCustomerName.trim() })
        .select()
        .single()

      if (error) throw error
      
      setCustomers([...customers, data])
      setNewCustomerName('')
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('顧客追加エラー:', error)
      alert('顧客の追加に失敗しました')
    }
  }

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editingCustomer.name.trim()) return

    try {
      const { error } = await supabase
        .from('customers')
        .update({ name: editingCustomer.name.trim() })
        .eq('id', editingCustomer.id)

      if (error) throw error
      
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id ? editingCustomer : c
      ))
      setEditingCustomer(null)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('顧客更新エラー:', error)
      alert('顧客の更新に失敗しました')
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('この顧客を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setCustomers(customers.filter(c => c.id !== id))
    } catch (error) {
      console.error('顧客削除エラー:', error)
      alert('顧客の削除に失敗しました。関連するプロジェクトがある可能性があります。')
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center items-center h-screen">読み込み中...</div>
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="mb-4 md:mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">顧客管理</h1>
          <p className="text-muted-foreground">顧客情報を管理</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規顧客
        </Button>
      </div>

      {/* 検索バー */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="顧客を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 顧客リスト */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? '顧客が見つかりません' : '顧客が登録されていません'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Link href={`/customers/${customer.id}`}>
                    <CardTitle className="text-lg hover:text-primary cursor-pointer transition-colors">
                      {customer.name}
                    </CardTitle>
                  </Link>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCustomer(customer)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCustomer(customer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  作成日: {new Date(customer.created_at).toLocaleDateString('ja-JP')}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 新規追加ダイアログ */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>新規顧客追加</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setNewCustomerName('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName">顧客名</Label>
                  <Input
                    id="customerName"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="顧客名を入力"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomer()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddCustomer} className="flex-1">
                    追加
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setNewCustomerName('')
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
      {isEditDialogOpen && editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>顧客編集</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingCustomer(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editCustomerName">顧客名</Label>
                  <Input
                    id="editCustomerName"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({
                      ...editingCustomer,
                      name: e.target.value
                    })}
                    placeholder="顧客名を入力"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateCustomer()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateCustomer} className="flex-1">
                    更新
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false)
                      setEditingCustomer(null)
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