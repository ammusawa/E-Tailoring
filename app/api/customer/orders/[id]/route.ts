import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const order = await queryOne(
      `SELECT o.*, 
              s.name as styleName, 
              s.category as styleCategory,
              s.imageUrl as styleImageUrl,
              s.tailorId as styleTailorId,
              -- Style's tailor (designer)
              st.firstName as styleTailorFirstName,
              st.lastName as styleTailorLastName,
              st.phone as styleTailorPhone,
              stp.bankName as styleTailorBankName,
              stp.accountName as styleTailorAccountName,
              stp.accountNumber as styleTailorAccountNumber,
              -- Assigned tailor (who claimed the order)
              ot.firstName as assignedTailorFirstName,
              ot.lastName as assignedTailorLastName,
              ot.phone as assignedTailorPhone,
              otp.bankName as assignedTailorBankName,
              otp.accountName as assignedTailorAccountName,
              otp.accountNumber as assignedTailorAccountNumber
       FROM orders o
       JOIN styles s ON o.styleId = s.id
       LEFT JOIN users st ON s.tailorId = st.id
       LEFT JOIN tailor_profiles stp ON st.id = stp.userId
       LEFT JOIN users ot ON o.tailorId = ot.id
       LEFT JOIN tailor_profiles otp ON ot.id = otp.userId
       WHERE o.id = ? AND o.customerId = ?`,
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
      `SELECT * FROM order_status_history 
       WHERE orderId = ? 
       ORDER BY createdAt DESC`,
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
        style: {
          name: order.styleName,
          category: order.styleCategory,
          imageUrl: order.styleImageUrl,
          tailor: order.styleTailorId
            ? {
                id: order.styleTailorId,
                firstName: order.styleTailorFirstName,
                lastName: order.styleTailorLastName,
                phone: order.styleTailorPhone,
                bankName: order.styleTailorBankName,
                accountName: order.styleTailorAccountName,
                accountNumber: order.styleTailorAccountNumber,
              }
            : null,
        },
        // Assigned tailor (who claimed the order) - this is what customers pay to
        assignedTailor: order.tailorId
          ? {
              id: order.tailorId,
              firstName: order.assignedTailorFirstName,
              lastName: order.assignedTailorLastName,
              phone: order.assignedTailorPhone,
              bankName: order.assignedTailorBankName,
              accountName: order.assignedTailorAccountName,
              accountNumber: order.assignedTailorAccountNumber,
            }
          : null,
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
