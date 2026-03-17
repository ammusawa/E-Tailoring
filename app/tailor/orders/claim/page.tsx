'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Order {
  id: string
  totalAmount: number
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    email: string
  }
  style: {
    name: string
    category: string
  }
}

export default function ClaimOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    fetchUnassignedOrders()
  }, [])

  const fetchUnassignedOrders = async () => {
    try {
      const response = await fetch('/api/tailor/orders/unassigned')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const claimOrder = async (orderId: string) => {
    setClaiming(orderId)
    try {
      const response = await fetch('/api/orders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          tailorId: 'current', // This should be replaced with actual tailor ID from auth
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to claim order')
      }

      toast.success('Order claimed successfully!')
      fetchUnassignedOrders()
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim order')
    } finally {
      setClaiming(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Available Orders</h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No unassigned orders available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{order.style.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="font-semibold text-primary-600">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => claimOrder(order.id)}
                      disabled={claiming === order.id}
                    >
                      {claiming === order.id ? 'Claiming...' : 'Claim Order'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

