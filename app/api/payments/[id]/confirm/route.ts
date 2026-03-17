import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { createPaymentNotification } from '@/lib/notifications'
import { z } from 'zod'

const paymentConfirmSchema = z.object({
  action: z.enum(['confirm', 'reject']),
  notes: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = paymentConfirmSchema.parse(body)

    // Get payment and verify order belongs to tailor
    const payment = await queryOne(
      `SELECT p.*, o.tailorId, o.customerId, o.totalAmount, o.paidAmount
       FROM payments p
       JOIN orders o ON p.orderId = o.id
       WHERE p.id = ? AND o.tailorId = ?`,
      [params.id, user.id]
    )

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found or unauthorized' },
        { status: 404 }
      )
    }

    if (payment.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json(
        { error: 'Payment is not pending confirmation' },
        { status: 400 }
      )
    }

    if (data.action === 'confirm') {
      // Update payment status
      await query(
        'UPDATE payments SET status = ? WHERE id = ?',
        ['PAID', params.id]
      )

      // Update order paid amount
      const newPaidAmount = parseFloat(payment.paidAmount) + parseFloat(payment.amount)
      await query(
        'UPDATE orders SET paidAmount = ? WHERE id = ?',
        [newPaidAmount, payment.orderId]
      )

      // Update order payment status if fully paid
      const order = await queryOne(
        'SELECT * FROM orders WHERE id = ?',
        [payment.orderId]
      )
      
      if (parseFloat(order.totalAmount) <= newPaidAmount) {
        await query(
          'UPDATE orders SET paymentStatus = ? WHERE id = ?',
          ['PAID', payment.orderId]
        )
      }

      // Send notification to customer
      const messageId = generateId()
      await query(
        `INSERT INTO messages (id, orderId, senderId, content, isRead)
         VALUES (?, ?, ?, ?, FALSE)`,
        [
          messageId,
          payment.orderId,
          user.id,
          `Payment of ${parseFloat(payment.amount).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })} confirmed. Thank you!`,
        ]
      )

      // Create notification for customer
      await createPaymentNotification(
        payment.orderId,
        payment.customerId,
        payment.tailorId,
        'PAYMENT_CONFIRMED',
        parseFloat(payment.amount)
      )

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed successfully',
      })
    } else {
      // Reject payment
      await query(
        'UPDATE payments SET status = ? WHERE id = ?',
        ['REJECTED', params.id]
      )

      // Send notification to customer
      const messageId = generateId()
      await query(
        `INSERT INTO messages (id, orderId, senderId, content, isRead)
         VALUES (?, ?, ?, ?, FALSE)`,
        [
          messageId,
          payment.orderId,
          user.id,
          `Payment receipt was rejected. ${data.notes || 'Please check the receipt and try again.'}`,
        ]
      )

      return NextResponse.json({
        success: true,
        message: 'Payment rejected',
      })
    }
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

    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

