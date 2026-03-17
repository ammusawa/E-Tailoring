import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    let sql = `
      SELECT n.*, o.id as orderId
      FROM notifications n
      LEFT JOIN orders o ON n.orderId = o.id
      WHERE n.userId = ?
    `

    const params: any[] = [user.id]

    if (unreadOnly) {
      sql += ' AND n.isRead = FALSE'
    }

    sql += ' ORDER BY n.createdAt DESC LIMIT ?'
    params.push(limit)

    const notifications = await query(sql, params)

    return NextResponse.json({
      notifications: notifications.map((n: any) => ({
        id: n.id,
        orderId: n.orderId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

