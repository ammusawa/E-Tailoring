import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { createOrderStatusNotification } from '@/lib/notifications'
import { z } from 'zod'

const statusUpdateSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'READY_FOR_FITTING',
    'REVISION',
    'COMPLETED',
    'COLLECTED',
    'CANCELLED',
  ]),
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
    const data = statusUpdateSchema.parse(body)

    // Verify tailor owns this order
    const order = await queryOne(
      'SELECT * FROM orders WHERE id = ? AND tailorId = ?',
      [params.id, user.id]
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      )
    }

    // Validate: Order can only be marked as COLLECTED if payment status is PAID
    if (data.status === 'COLLECTED' && order.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { error: 'Order cannot be marked as collected until payment is completed' },
        { status: 400 }
      )
    }

    // Update order status
    await query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [data.status, params.id]
    )

    // Add to status history
    const historyId = generateId()
    await query(
      `INSERT INTO order_status_history (id, orderId, status, notes)
       VALUES (?, ?, ?, ?)`,
      [historyId, params.id, data.status, data.notes || null]
    )

    // Create notification for customer
    await createOrderStatusNotification(
      params.id,
      order.customerId,
      order.tailorId,
      data.status,
      data.notes || undefined
    )

    const updatedOrder = await queryOne(
      'SELECT * FROM orders WHERE id = ?',
      [params.id]
    )

    return NextResponse.json({ order: updatedOrder })
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

    console.error('Error updating status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
