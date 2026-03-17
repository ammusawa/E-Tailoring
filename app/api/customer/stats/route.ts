import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const user = await requireAuth()

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get order statistics
    const [orderStats] = await query(
      `SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status IN ('CONFIRMED', 'IN_PROGRESS', 'READY_FOR_FITTING', 'REVISION') THEN 1 ELSE 0 END) as activeOrders,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completedOrders,
        SUM(CASE WHEN status = 'COLLECTED' THEN 1 ELSE 0 END) as collectedOrders,
        SUM(CASE WHEN paymentStatus = 'PAID' THEN totalAmount ELSE 0 END) as totalSpent,
        SUM(CASE WHEN paymentStatus = 'PENDING' THEN totalAmount ELSE 0 END) as pendingPayment
       FROM orders
       WHERE customerId = ?`,
      [user.id]
    )

    // Get recent orders (last 5)
    const recentOrders = await query(
      `SELECT o.id, o.status, o.totalAmount, o.createdAt, s.name as styleName
       FROM orders o
       JOIN styles s ON o.styleId = s.id
       WHERE o.customerId = ?
       ORDER BY o.createdAt DESC
       LIMIT 5`,
      [user.id]
    )

    return NextResponse.json({
      stats: {
        totalOrders: parseInt(orderStats.totalOrders) || 0,
        pendingOrders: parseInt(orderStats.pendingOrders) || 0,
        activeOrders: parseInt(orderStats.activeOrders) || 0,
        completedOrders: parseInt(orderStats.completedOrders) || 0,
        collectedOrders: parseInt(orderStats.collectedOrders) || 0,
        totalSpent: parseFloat(orderStats.totalSpent) || 0,
        pendingPayment: parseFloat(orderStats.pendingPayment) || 0,
      },
      recentOrders: recentOrders.map((order: any) => ({
        id: order.id,
        status: order.status,
        totalAmount: parseFloat(order.totalAmount),
        createdAt: order.createdAt,
        styleName: order.styleName,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching customer stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

