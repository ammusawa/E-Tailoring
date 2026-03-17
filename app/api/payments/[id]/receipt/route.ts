import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    // Get payment
    const payment = await queryOne(
      `SELECT p.*, o.customerId, o.tailorId
       FROM payments p
       JOIN orders o ON p.orderId = o.id
       WHERE p.id = ?`,
      [params.id]
    )

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Verify user has access (either customer or tailor of the order)
    if (
      user.role === 'CUSTOMER' && payment.customerId !== user.id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (
      user.role === 'TAILOR' && payment.tailorId !== user.id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (!payment.receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      receipt: payment.receipt,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching receipt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

