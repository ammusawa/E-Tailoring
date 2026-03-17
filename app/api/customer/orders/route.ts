import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { generateId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const orders = await query(
      `SELECT o.*, 
              s.name as styleName, 
              s.category as styleCategory,
              s.imageUrl as styleImageUrl,
              s.tailorId as styleTailorId,
              t.firstName as styleTailorFirstName,
              t.lastName as styleTailorLastName
       FROM orders o
       JOIN styles s ON o.styleId = s.id
       LEFT JOIN users t ON s.tailorId = t.id
       WHERE o.customerId = ?
       ORDER BY o.createdAt DESC`,
      [user.id]
    )

    // Format orders
    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount),
      createdAt: order.createdAt,
      style: {
        name: order.styleName,
        category: order.styleCategory,
        imageUrl: order.styleImageUrl,
        tailor: order.styleTailorId
          ? {
              id: order.styleTailorId,
              firstName: order.styleTailorFirstName,
              lastName: order.styleTailorLastName,
            }
          : null,
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      styleId,
      customStyle,
      quantity = 1,
      deliveryAddress,
      deliveryDate,
      specialInstructions,
      measurements,
    } = body

    if (!styleId && !customStyle) {
      return NextResponse.json(
        { error: 'Please select a catalog style or provide custom design details' },
        { status: 400 }
      )
    }

    let finalStyleId = styleId
    let style = null

    if (customStyle) {
      if (!customStyle.name || !customStyle.category || !customStyle.basePrice) {
        return NextResponse.json(
          { error: 'Custom design requires name, category and price' },
          { status: 400 }
        )
      }

      const newStyleId = generateId()
      await query(
        `INSERT INTO styles (id, name, description, category, imageUrl, basePrice, isActive)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          newStyleId,
          customStyle.name,
          customStyle.description || null,
          customStyle.category,
          customStyle.imageData || customStyle.imageUrl || null,
          customStyle.basePrice,
        ]
      )

      finalStyleId = newStyleId
      style = {
        basePrice: customStyle.basePrice,
        tailorId: null,
        name: customStyle.name,
        category: customStyle.category,
        imageUrl: customStyle.imageData || customStyle.imageUrl || null,
      }
    } else {
      style = await queryOne(
        'SELECT * FROM styles WHERE id = ?',
        [styleId]
      )

      if (!style) {
        return NextResponse.json(
          { error: 'Style not found' },
          { status: 404 }
        )
      }
    }

    const totalAmount = parseFloat(style.basePrice) * quantity
    const assignedTailorId = style.tailorId || null
    const orderId = generateId()
    const measurementId = generateId()
    const statusHistoryId = generateId()

    // Create order
    await query(
      `INSERT INTO orders (id, customerId, tailorId, styleId, quantity, totalAmount, deliveryAddress, deliveryDate, specialInstructions, status, paymentStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING')`,
      [orderId, user.id, assignedTailorId, finalStyleId, quantity, totalAmount, deliveryAddress, deliveryDate || null, specialInstructions || null]
    )

    // Create measurement
    await query(
      `INSERT INTO measurements (id, orderId, chest, waist, hips, shoulder, sleeveLength, shirtLength, trouserLength, inseam, outseam, neck, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        measurementId,
        orderId,
        measurements.chest || null,
        measurements.waist || null,
        measurements.hips || null,
        measurements.shoulder || null,
        measurements.sleeveLength || null,
        measurements.shirtLength || null,
        measurements.trouserLength || null,
        measurements.inseam || null,
        measurements.outseam || null,
        measurements.neck || null,
        measurements.notes || null,
      ]
    )

    // Create status history
    await query(
      `INSERT INTO order_status_history (id, orderId, status, notes)
       VALUES (?, ?, 'PENDING', 'Order created')`,
      [statusHistoryId, orderId]
    )

    // Get created order with relations
    const order = await queryOne(
      `SELECT o.*, 
              s.name as styleName, 
              s.category as styleCategory,
              s.imageUrl as styleImageUrl,
              s.tailorId as styleTailorId,
              t.firstName as styleTailorFirstName,
              t.lastName as styleTailorLastName
       FROM orders o
       JOIN styles s ON o.styleId = s.id
       LEFT JOIN users t ON s.tailorId = t.id
       WHERE o.id = ?`,
      [orderId]
    )

    const measurement = await queryOne(
      'SELECT * FROM measurements WHERE orderId = ?',
      [orderId]
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
              }
            : null,
        },
        measurement,
      },
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
