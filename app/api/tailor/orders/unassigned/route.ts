import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const user = await requireAuth()

    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get unassigned orders
    const orders = await query(
      `SELECT o.*, 
              u.firstName as customerFirstName, 
              u.lastName as customerLastName,
              u.email as customerEmail,
              s.name as styleName,
              s.category as styleCategory
       FROM orders o
       JOIN users u ON o.customerId = u.id
       JOIN styles s ON o.styleId = s.id
       WHERE o.tailorId IS NULL AND o.status = 'PENDING'
       ORDER BY o.createdAt DESC`
    )

    // Format orders
    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      totalAmount: parseFloat(order.totalAmount),
      createdAt: order.createdAt,
      customer: {
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
        email: order.customerEmail,
      },
      style: {
        name: order.styleName,
        category: order.styleCategory,
      },
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching unassigned orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
