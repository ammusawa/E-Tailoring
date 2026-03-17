import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(
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

    const order = await queryOne(
      `SELECT o.*, 
              u.firstName as customerFirstName, 
              u.lastName as customerLastName,
              u.email as customerEmail,
              u.phone as customerPhone,
              s.name as styleName,
              s.category as styleCategory
       FROM orders o
       JOIN users u ON o.customerId = u.id
       JOIN styles s ON o.styleId = s.id
       WHERE o.id = ? AND o.tailorId = ?`,
      [params.id, user.id]
    )

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get measurement
    const measurement = await queryOne(
      'SELECT * FROM measurements WHERE orderId = ?',
      [params.id]
    )

    // Get status history
    const statusHistory = await query(
      'SELECT * FROM order_status_history WHERE orderId = ? ORDER BY createdAt ASC',
      [params.id]
    )

    // Get payment history
    const payments = await query(
      `SELECT id, amount, status, receipt, createdAt, updatedAt
       FROM payments 
       WHERE orderId = ? 
       ORDER BY createdAt DESC`,
      [params.id]
    )

    return NextResponse.json({
      order: {
        ...order,
        totalAmount: parseFloat(order.totalAmount),
        paidAmount: parseFloat(order.paidAmount),
        customer: {
          firstName: order.customerFirstName,
          lastName: order.customerLastName,
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        style: {
          name: order.styleName,
          category: order.styleCategory,
        },
        measurement,
        statusHistory,
        payments: payments.map((p: any) => ({
          id: p.id,
          amount: parseFloat(p.amount),
          status: p.status,
          hasReceipt: !!p.receipt,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
