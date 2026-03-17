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

    // Get all orders for this tailor
    const orders = await query(
      'SELECT * FROM orders WHERE tailorId = ?',
      [user.id]
    )
    const designCountResult = await query(
      'SELECT COUNT(*) as count FROM styles WHERE tailorId = ?',
      [user.id]
    )
    const designCount = designCountResult[0]?.count || 0

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) => o.status === 'PENDING').length,
      inProgressOrders: orders.filter((o: any) => o.status === 'IN_PROGRESS').length,
      completedOrders: orders.filter((o: any) => o.status === 'COMPLETED').length,
      totalRevenue: orders
        .filter((o: any) => o.paymentStatus === 'PAID')
        .reduce((sum: number, o: any) => sum + parseFloat(o.paidAmount), 0),
      averageRating: 4.5, // This would come from reviews in a full implementation
      designs: designCount,
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
