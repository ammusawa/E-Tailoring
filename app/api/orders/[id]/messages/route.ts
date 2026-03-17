import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { createMessageNotification } from '@/lib/notifications'
import { z } from 'zod'

const messageSchema = z.object({
  content: z.string().min(1),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    // Verify user has access to this order
    const order = await queryOne(
      `SELECT * FROM orders 
       WHERE id = ? AND (customerId = ? OR tailorId = ?)`,
      [params.id, user.id, user.id]
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      )
    }

    const messages = await query(
      `SELECT m.*, 
              u.id as senderId,
              u.firstName as senderFirstName,
              u.lastName as senderLastName,
              u.role as senderRole
       FROM messages m
       JOIN users u ON m.senderId = u.id
       WHERE m.orderId = ?
       ORDER BY m.createdAt ASC`,
      [params.id]
    )

    // Format messages
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      sender: {
        id: msg.senderId,
        firstName: msg.senderFirstName,
        lastName: msg.senderLastName,
        role: msg.senderRole,
      },
    }))

    return NextResponse.json({ messages: formattedMessages })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = messageSchema.parse(body)

    // Verify user has access to this order
    const order = await queryOne(
      `SELECT * FROM orders 
       WHERE id = ? AND (customerId = ? OR tailorId = ?)`,
      [params.id, user.id, user.id]
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      )
    }

    const messageId = generateId()
    await query(
      `INSERT INTO messages (id, orderId, senderId, content)
       VALUES (?, ?, ?, ?)`,
      [messageId, params.id, user.id, data.content]
    )

    // Create notification for recipient
    const recipientId = user.id === order.customerId ? order.tailorId : order.customerId
    if (recipientId) {
      await createMessageNotification(params.id, user.id, recipientId, data.content)
    }

    const message = await queryOne(
      `SELECT m.*, 
              u.id as senderId,
              u.firstName as senderFirstName,
              u.lastName as senderLastName,
              u.role as senderRole
       FROM messages m
       JOIN users u ON m.senderId = u.id
       WHERE m.id = ?`,
      [messageId]
    )

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        sender: {
          id: message.senderId,
          firstName: message.senderFirstName,
          lastName: message.senderLastName,
          role: message.senderRole,
        },
      },
    }, { status: 201 })
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

    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
