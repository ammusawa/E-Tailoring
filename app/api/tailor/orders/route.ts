import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')

    let sql = `
      SELECT o.*, 
             u.firstName as customerFirstName, 
             u.lastName as customerLastName,
             u.email as customerEmail,
             u.phone as customerPhone,
             s.name as styleName,
             s.category as styleCategory
      FROM orders o
      JOIN users u ON o.customerId = u.id
      JOIN styles s ON o.styleId = s.id
      WHERE o.tailorId = ?
    `
    const params: any[] = [user.id]

    if (status) {
      sql += ' AND o.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY o.createdAt DESC LIMIT ?'
    params.push(limit)

    const orders = await query(sql, params)

    // Format orders
    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount),
      createdAt: order.createdAt,
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
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
