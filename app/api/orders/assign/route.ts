import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { createOrderAssignedNotification, createOrderStatusNotification } from '@/lib/notifications'
import { z } from 'zod'

const assignSchema = z.object({
  orderId: z.string(),
  tailorId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Only tailors can claim orders
    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = assignSchema.parse(body)
    
    // If tailorId is 'current', use the authenticated user's ID
    const tailorId = data.tailorId === 'current' ? user.id : data.tailorId

    // Verify order exists and is pending
    const order = await queryOne(
      'SELECT * FROM orders WHERE id = ?',
      [data.orderId]
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Order cannot be assigned' },
        { status: 400 }
      )
    }

    // Verify tailor exists and is the current user
    const tailor = await queryOne(
      'SELECT * FROM users WHERE id = ? AND role = ?',
      [tailorId, 'TAILOR']
    )

    if (!tailor || tailor.id !== user.id) {
      return NextResponse.json(
        { error: 'Invalid tailor' },
        { status: 400 }
      )
    }

    // Assign order to tailor
    await query(
      `UPDATE orders SET tailorId = ?, status = 'CONFIRMED' WHERE id = ?`,
      [tailorId, data.orderId]
    )

    // Add to status history
    const historyId = generateId()
    await query(
      `INSERT INTO order_status_history (id, orderId, status, notes)
       VALUES (?, ?, 'CONFIRMED', 'Order assigned to tailor')`,
      [historyId, data.orderId]
    )

    // Create notifications
    await createOrderAssignedNotification(data.orderId, tailorId)
    await createOrderStatusNotification(
      data.orderId,
      order.customerId,
      tailorId,
      'CONFIRMED',
      'Order assigned to tailor'
    )

    const updatedOrder = await queryOne(
      'SELECT * FROM orders WHERE id = ?',
      [data.orderId]
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

    console.error('Error assigning order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
