import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { createPaymentNotification } from '@/lib/notifications'
import { z } from 'zod'

const paymentSubmitSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  receipt: z.string(), // base64 image
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = paymentSubmitSchema.parse(body)

    // Verify order belongs to customer
    const order = await queryOne(
      'SELECT * FROM orders WHERE id = ? AND customerId = ?',
      [data.orderId, user.id]
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if order has an assigned tailor
    if (!order.tailorId) {
      return NextResponse.json(
        { error: 'Order has not been assigned to a tailor yet' },
        { status: 400 }
      )
    }

    // Check if amount matches order total
    const remainingAmount = parseFloat(order.totalAmount) - parseFloat(order.paidAmount)
    if (data.amount > remainingAmount) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining balance' },
        { status: 400 }
      )
    }

    // Create payment record
    const paymentId = generateId()
    await query(
      `INSERT INTO payments (id, orderId, amount, currency, status, receipt)
       VALUES (?, ?, ?, 'NGN', 'PENDING_CONFIRMATION', ?)`,
      [paymentId, data.orderId, data.amount, data.receipt]
    )

    // Send notification message to tailor
    const messageId = generateId()
    await query(
      `INSERT INTO messages (id, orderId, senderId, content, isRead)
       VALUES (?, ?, ?, ?, FALSE)`,
      [
        messageId,
        data.orderId,
        user.id,
        `Payment of ${data.amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })} submitted. Please review the receipt and confirm.`,
      ]
    )

    // Create notification for tailor
    await createPaymentNotification(
      data.orderId,
      order.customerId,
      order.tailorId,
      'PAYMENT_SUBMITTED',
      data.amount
    )

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentId,
        orderId: data.orderId,
        amount: data.amount,
        status: 'PENDING_CONFIRMATION',
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error submitting payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

