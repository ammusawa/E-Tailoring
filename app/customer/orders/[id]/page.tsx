'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MessageSquare, ArrowLeft, Upload, X, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Order {
  id: string
  status: string
  paymentStatus: string
  quantity: number
  totalAmount: number
  paidAmount: number
  deliveryAddress: string
  deliveryDate: string | null
  specialInstructions: string | null
  createdAt: string
  style: {
    name: string
    category: string
    tailor?: {
      id: string
      firstName: string
      lastName: string
      phone?: string | null
      bankName?: string | null
      accountName?: string | null
      accountNumber?: string | null
    } | null
  }
  assignedTailor?: {
    id: string
    firstName: string
    lastName: string
    phone?: string | null
    bankName?: string | null
    accountName?: string | null
    accountNumber?: string | null
  } | null
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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [submittingPayment, setSubmittingPayment] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchOrder()
    }
  }, [params.id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/customer/orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
      } else {
        toast.error('Failed to load order')
        router.push('/customer/dashboard')
      }
    } catch (error) {
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      setReceiptFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitPayment = async () => {
    if (!order || !receiptFile || !paymentAmount) {
      toast.error('Please fill in all fields')
      return
    }

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const remainingBalance = order.totalAmount - order.paidAmount
    if (amount > remainingBalance) {
      toast.error(`Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`)
      return
    }

    setSubmittingPayment(true)
    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Receipt = reader.result as string

        const response = await fetch('/api/payments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            amount: amount,
            receipt: base64Receipt,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to submit payment')
        }

        toast.success('Payment submitted! Your tailor will review and confirm it.')
        setShowPaymentForm(false)
        setPaymentAmount('')
        setReceiptFile(null)
        setReceiptPreview(null)
        fetchOrder()
      }
      reader.readAsDataURL(receiptFile)
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit payment')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PENDING_CONFIRMATION':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Confirmed'
      case 'REJECTED':
        return 'Rejected'
      case 'PENDING_CONFIRMATION':
        return 'Pending Review'
      default:
        return status
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/customer/orders" className="inline-flex items-center text-primary-600 hover:underline mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
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
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-mono text-sm">{order.id}</p>
                </div>
                {order.style.tailor && (
                  <div>
                    <p className="text-sm text-gray-600">Designed by</p>
                    <p className="font-semibold">
                      {order.style.tailor.firstName} {order.style.tailor.lastName}
                    </p>
                    {order.style.tailor.phone && (
                      <p className="text-sm text-gray-500">{order.style.tailor.phone}</p>
                    )}
                  </div>
                )}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
                <CardDescription>
                  Send a bank transfer directly to your assigned tailor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span>{formatCurrency(order.paidAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Balance:</span>
                  <span className="font-semibold">
                    {formatCurrency(order.totalAmount - order.paidAmount)}
                  </span>
                </div>
                {order.assignedTailor?.accountNumber ? (
                  <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4 space-y-2">
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Assigned Tailor</p>
                      <p className="font-semibold text-sm">
                        {order.assignedTailor.firstName} {order.assignedTailor.lastName}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Account Name</span>
                      <span className="font-semibold">{order.assignedTailor.accountName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bank</span>
                      <span className="font-semibold">{order.assignedTailor.bankName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Account Number</span>
                      <span className="font-semibold">{order.assignedTailor.accountNumber}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Your tailor will share bank transfer details once they claim and confirm the order.
                  </p>
                )}
                {order.assignedTailor?.accountNumber && order.totalAmount > order.paidAmount && (
                  <>
                    {!showPaymentForm ? (
                      <Button
                        onClick={() => setShowPaymentForm(true)}
                        className="w-full mt-2"
                        disabled={!order.assignedTailor}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Payment Receipt
                      </Button>
                    ) : (
                      <div className="mt-4 p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Submit Payment</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowPaymentForm(false)
                              setPaymentAmount('')
                              setReceiptFile(null)
                              setReceiptPreview(null)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Amount (NGN)
                          </label>
                          <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="Enter payment amount"
                            min="0"
                            max={order.totalAmount - order.paidAmount}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Remaining: {formatCurrency(order.totalAmount - order.paidAmount)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Payment Receipt
                          </label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptChange}
                          />
                          {receiptPreview && (
                            <div className="mt-2 relative">
                              <img
                                src={receiptPreview}
                                alt="Receipt preview"
                                className="w-full h-48 object-contain border rounded"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => {
                                  setReceiptFile(null)
                                  setReceiptPreview(null)
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={handleSubmitPayment}
                          className="w-full"
                          disabled={submittingPayment || !paymentAmount || !receiptFile}
                        >
                          {submittingPayment ? 'Submitting...' : 'Submit Payment'}
                        </Button>
                      </div>
                    )}
                  </>
                )}
                
                {order.payments && order.payments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold">Payment History</p>
                    {order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {getPaymentStatusIcon(payment.status)}
                          <span>{formatCurrency(payment.amount)}</span>
                        </div>
                        <span className="text-gray-600">
                          {getPaymentStatusText(payment.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Chat directly with your assigned tailor
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={`/customer/orders/${order.id}/chat`}>
                  <Button className="w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat with Tailor
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

