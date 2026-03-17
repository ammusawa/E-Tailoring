'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MessageSquare, ArrowLeft, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

interface Order {
  id: string
  status: string
  paymentStatus: string
  quantity: number
  totalAmount: number
  deliveryAddress: string
  deliveryDate: string | null
  specialInstructions: string | null
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  style: {
    name: string
    category: string
  }
  measurement: {
    chest: number | null
    waist: number | null
    hips: number | null
    shoulder: number | null
    sleeveLength: number | null
    shirtLength: number | null
    trouserLength: number | null
    inseam: number | null
    outseam: number | null
    neck: number | null
    notes: string | null
    verified: boolean
  } | null
  statusHistory: Array<{
    status: string
    notes: string | null
    createdAt: string
  }>
  payments?: Array<{
    id: string
    amount: number
    status: string
    hasReceipt: boolean
    createdAt: string
    updatedAt: string
  }>
}

export default function TailorOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchOrder()
      // Poll for updates every 15 seconds (reduced frequency to prevent connection exhaustion)
      const interval = setInterval(fetchOrder, 15000)
      return () => clearInterval(interval)
    }
  }, [params.id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/tailor/orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
      } else {
        toast.error('Failed to load order')
        router.push('/tailor/dashboard')
      }
    } catch (error) {
      // Silent fail for polling
      if (loading) {
        toast.error('Failed to load order')
      }
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update status')
      }

      toast.success('Status updated successfully')
      fetchOrder()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`)
      if (response.ok) {
        const data = await response.json()
        setViewingReceipt(data.receipt)
      } else {
        toast.error('Failed to load receipt')
      }
    } catch (error) {
      toast.error('Failed to load receipt')
    }
  }

  const handleConfirmPayment = async (paymentId: string, action: 'confirm' | 'reject') => {
    setConfirmingPayment(paymentId)
    try {
      const response = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: action === 'reject' ? rejectNotes : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process payment')
      }

      toast.success(`Payment ${action === 'confirm' ? 'confirmed' : 'rejected'} successfully`)
      setConfirmingPayment(null)
      setRejectNotes('')
      setViewingReceipt(null)
      fetchOrder()
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payment')
    } finally {
      setConfirmingPayment(null)
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

  if (!order) {
    return null
  }

  const statusOptions = [
    { value: 'CONFIRMED', label: 'Confirm Order' },
    { value: 'IN_PROGRESS', label: 'Start Work' },
    { value: 'READY_FOR_FITTING', label: 'Ready for Fitting' },
    { value: 'REVISION', label: 'Needs Revision' },
    { value: 'COMPLETED', label: 'Mark as Completed' },
    { value: 'COLLECTED', label: 'Mark as Collected' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tailor/dashboard" className="inline-flex items-center text-primary-600 hover:underline mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{order.style.name}</CardTitle>
                    <CardDescription>{order.style.category}</CardDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{order.customer.email}</p>
                  {order.customer.phone && (
                    <p className="text-sm text-gray-600">{order.customer.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="font-semibold">{order.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Address</p>
                  <p>{order.deliveryAddress}</p>
                </div>
                {order.deliveryDate && (
                  <div>
                    <p className="text-sm text-gray-600">Preferred Delivery Date</p>
                    <p>{formatDate(order.deliveryDate)}</p>
                  </div>
                )}
                {order.specialInstructions && (
                  <div>
                    <p className="text-sm text-gray-600">Special Instructions</p>
                    <p>{order.specialInstructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Measurements */}
            {order.measurement && (
              <Card>
                <CardHeader>
                  <CardTitle>Measurements</CardTitle>
                  <CardDescription>
                    {order.measurement.verified ? 'Verified' : 'Pending Verification'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {order.measurement.chest && (
                      <div>
                        <p className="text-sm text-gray-600">Chest</p>
                        <p className="font-semibold">{order.measurement.chest} cm</p>
                      </div>
                    )}
                    {order.measurement.waist && (
                      <div>
                        <p className="text-sm text-gray-600">Waist</p>
                        <p className="font-semibold">{order.measurement.waist} cm</p>
                      </div>
                    )}
                    {order.measurement.hips && (
                      <div>
                        <p className="text-sm text-gray-600">Hips</p>
                        <p className="font-semibold">{order.measurement.hips} cm</p>
                      </div>
                    )}
                    {order.measurement.shoulder && (
                      <div>
                        <p className="text-sm text-gray-600">Shoulder</p>
                        <p className="font-semibold">{order.measurement.shoulder} cm</p>
                      </div>
                    )}
                    {order.measurement.sleeveLength && (
                      <div>
                        <p className="text-sm text-gray-600">Sleeve Length</p>
                        <p className="font-semibold">{order.measurement.sleeveLength} cm</p>
                      </div>
                    )}
                    {order.measurement.shirtLength && (
                      <div>
                        <p className="text-sm text-gray-600">Shirt Length</p>
                        <p className="font-semibold">{order.measurement.shirtLength} cm</p>
                      </div>
                    )}
                    {order.measurement.trouserLength && (
                      <div>
                        <p className="text-sm text-gray-600">Trouser Length</p>
                        <p className="font-semibold">{order.measurement.trouserLength} cm</p>
                      </div>
                    )}
                    {order.measurement.inseam && (
                      <div>
                        <p className="text-sm text-gray-600">Inseam</p>
                        <p className="font-semibold">{order.measurement.inseam} cm</p>
                      </div>
                    )}
                    {order.measurement.outseam && (
                      <div>
                        <p className="text-sm text-gray-600">Outseam</p>
                        <p className="font-semibold">{order.measurement.outseam} cm</p>
                      </div>
                    )}
                    {order.measurement.neck && (
                      <div>
                        <p className="text-sm text-gray-600">Neck</p>
                        <p className="font-semibold">{order.measurement.neck} cm</p>
                      </div>
                    )}
                  </div>
                  {order.measurement.notes && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">Notes</p>
                      <p>{order.measurement.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Status History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.statusHistory.map((history, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(history.status)}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{history.status.replace('_', ' ')}</p>
                          {history.notes && <p className="text-sm text-gray-600">{history.notes}</p>}
                          <p className="text-xs text-gray-500 mt-1">{formatDate(history.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Amount</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-primary-600">
                    {formatCurrency(order.totalAmount)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Payment Status: {order.paymentStatus}
                  </p>
                  <p className="text-sm text-gray-600">
                    Paid: {formatCurrency(order.paidAmount)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Balance: {formatCurrency(order.totalAmount - order.paidAmount)}
                  </p>
                </div>

                {order.payments && order.payments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold">Payments</p>
                    {order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {payment.status === 'PAID' && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {payment.status === 'REJECTED' && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {payment.status === 'PENDING_CONFIRMATION' && (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                            <span className="font-semibold">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {payment.status === 'PAID' && 'Confirmed'}
                            {payment.status === 'REJECTED' && 'Rejected'}
                            {payment.status === 'PENDING_CONFIRMATION' && 'Pending'}
                          </span>
                        </div>
                        {payment.hasReceipt && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleViewReceipt(payment.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Receipt
                          </Button>
                        )}
                        {payment.status === 'PENDING_CONFIRMATION' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleConfirmPayment(payment.id, 'confirm')}
                              disabled={confirmingPayment === payment.id}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => {
                                const notes = prompt('Reason for rejection (optional):')
                                if (notes !== null) {
                                  setRejectNotes(notes)
                                  handleConfirmPayment(payment.id, 'reject')
                                }
                              }}
                              disabled={confirmingPayment === payment.id}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {viewingReceipt && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Payment Receipt</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingReceipt(null)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <img
                    src={viewingReceipt}
                    alt="Payment receipt"
                    className="w-full h-auto rounded border"
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statusOptions.map((option) => {
                  // Disable COLLECTED if payment is not PAID
                  const isCollectedDisabled = option.value === 'COLLECTED' && order.paymentStatus !== 'PAID'
                  const isDisabled = updating || order.status === option.value || isCollectedDisabled
                  
                  return (
                    <div key={option.value}>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => updateStatus(option.value)}
                        disabled={isDisabled}
                        title={isCollectedDisabled ? 'Payment must be completed before marking as collected' : undefined}
                      >
                        {option.label}
                      </Button>
                      {isCollectedDisabled && order.status !== option.value && (
                        <p className="text-xs text-gray-500 mt-1 ml-2">
                          Payment must be completed
                        </p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Link href={`/tailor/orders/${order.id}/chat`}>
                  <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat with Customer
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

