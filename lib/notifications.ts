import { query, queryOne } from './db'
import { generateId } from './utils'

export type NotificationType =
  | 'MESSAGE'
  | 'ORDER_CONFIRMED'
  | 'ORDER_STATUS_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_SUBMITTED'
  | 'ORDER_ASSIGNED'

interface CreateNotificationParams {
  userId: string
  orderId?: string
  type: NotificationType
  title: string
  message: string
}

export async function createNotification(params: CreateNotificationParams) {
  const notificationId = generateId()
  await query(
    `INSERT INTO notifications (id, userId, orderId, type, title, message, isRead)
     VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
    [
      notificationId,
      params.userId,
      params.orderId || null,
      params.type,
      params.title,
      params.message,
    ]
  )
  return notificationId
}

export async function createOrderStatusNotification(
  orderId: string,
  customerId: string,
  tailorId: string | null,
  status: string,
  notes?: string
) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    CONFIRMED: {
      title: 'Order Confirmed',
      message: 'Your order has been confirmed by the tailor.',
    },
    IN_PROGRESS: {
      title: 'Order In Progress',
      message: 'Your tailor has started working on your order.',
    },
    READY_FOR_FITTING: {
      title: 'Ready for Fitting',
      message: 'Your order is ready for fitting. Please contact your tailor.',
    },
    REVISION: {
      title: 'Revision Required',
      message: 'Your order needs revision. Please check the details.',
    },
    COMPLETED: {
      title: 'Order Completed',
      message: 'Your order has been completed!',
    },
    COLLECTED: {
      title: 'Order Collected',
      message: 'Your order has been collected.',
    },
    CANCELLED: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled.',
    },
  }

  const statusInfo = statusMessages[status]
  if (statusInfo && customerId) {
    await createNotification({
      userId: customerId,
      orderId,
      type: 'ORDER_STATUS_UPDATED',
      title: statusInfo.title,
      message: notes ? `${statusInfo.message} ${notes}` : statusInfo.message,
    })
  }
}

export async function createPaymentNotification(
  orderId: string,
  customerId: string,
  tailorId: string | null,
  type: 'PAYMENT_SUBMITTED' | 'PAYMENT_CONFIRMED',
  amount: number
) {
  if (type === 'PAYMENT_SUBMITTED' && tailorId) {
    await createNotification({
      userId: tailorId,
      orderId,
      type: 'PAYMENT_SUBMITTED',
      title: 'Payment Submitted',
      message: `A payment of ${amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })} has been submitted. Please review the receipt.`,
    })
  } else if (type === 'PAYMENT_CONFIRMED' && customerId) {
    await createNotification({
      userId: customerId,
      orderId,
      type: 'PAYMENT_CONFIRMED',
      title: 'Payment Confirmed',
      message: `Your payment of ${amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })} has been confirmed.`,
    })
  }
}

export async function createMessageNotification(
  orderId: string,
  senderId: string,
  recipientId: string,
  messagePreview: string
) {
  // Get sender name
  const sender = await queryOne('SELECT firstName, lastName FROM users WHERE id = ?', [senderId])
  const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Someone'

  await createNotification({
    userId: recipientId,
    orderId,
    type: 'MESSAGE',
    title: 'New Message',
    message: `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
  })
}

export async function createOrderAssignedNotification(
  orderId: string,
  tailorId: string
) {
  await createNotification({
    userId: tailorId,
    orderId,
    type: 'ORDER_ASSIGNED',
    title: 'New Order Assigned',
    message: 'A new order has been assigned to you.',
  })
}

