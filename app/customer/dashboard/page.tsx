'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, Clock, CheckCircle, ShoppingBag, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  activeOrders: number
  completedOrders: number
  collectedOrders: number
  totalSpent: number
  pendingPayment: number
}

interface RecentOrder {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  styleName: string
}

export default function CustomerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/customer/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentOrders(data.recentOrders || [])
      } else {
        toast.error('Failed to load dashboard data')
      }
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      READY_FOR_FITTING: 'bg-orange-100 text-orange-800',
      REVISION: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-green-100 text-green-800',
      COLLECTED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/customer/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-primary-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Orders</p>
                    <p className="text-2xl font-bold">{stats.activeOrders}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold">{stats.completedOrders}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold text-primary-600">
                      {formatCurrency(stats.totalSpent)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Stats */}
        {stats && (stats.pendingPayment > 0 || stats.collectedOrders > 0) && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {stats.pendingPayment > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Payment</CardTitle>
                  <CardDescription>Amount awaiting payment confirmation</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatCurrency(stats.pendingPayment)}
                  </p>
                </CardContent>
              </Card>
            )}
            {stats.collectedOrders > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Collected Orders</CardTitle>
                  <CardDescription>Orders you've collected</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.collectedOrders}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your latest orders</CardDescription>
              </div>
              <Link href="/customer/orders">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-4">Start by placing your first order</p>
                <Link href="/customer/orders/new">
                  <Button>Place Order</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{order.styleName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(order.createdAt)} • {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                    <Link href={`/customer/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Browse Designs</CardTitle>
              <CardDescription>Explore designs from our talented tailors</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/customer/designs">
                <Button className="w-full">View Designs</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Place New Order</CardTitle>
              <CardDescription>Create a custom order or choose from existing designs</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/customer/orders/new">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

