import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Notification from '../../../../server/models/Notification'
import User from '../../../../server/models/User'
import { sendNotification } from '../../../../lib/notifications'

// POST /api/notifications/send - Send notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const { 
      userId, 
      type, 
      category, 
      recipient, 
      data,
      priority = 'normal',
      scheduleAt 
    } = body

    // Validate required fields
    if (!userId || !type || !category || !recipient || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, category, recipient, data' },
        { status: 400 }
      )
    }

    // Validate notification type
    if (!['email', 'sms', 'both'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be email, sms, or both' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = [
      'appointment_confirmation',
      'payment_confirmation', 
      'appointment_reminder',
      'doctor_assignment',
      'referral_reward',
      'password_reset',
      'email_verification'
    ]
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid notification category' },
        { status: 400 }
      )
    }

    // Get user to check notification preferences
    const user = await User.findById(userId).select('profile.notificationPreferences email profile.phone')
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check notification preferences
    const preferences = user.profile?.notificationPreferences || {
      allowEmail: true,
      allowSMS: true,
      allowPush: true
    }

    // Determine what types to send based on preferences
    let actualType = type
    if (type === 'both') {
      if (!preferences.allowEmail && !preferences.allowSMS) {
        return NextResponse.json(
          { error: 'User has disabled all notifications' },
          { status: 400 }
        )
      } else if (!preferences.allowEmail) {
        actualType = 'sms'
      } else if (!preferences.allowSMS) {
        actualType = 'email'
      }
    } else if (type === 'email' && !preferences.allowEmail) {
      return NextResponse.json(
        { error: 'User has disabled email notifications' },
        { status: 400 }
      )
    } else if (type === 'sms' && !preferences.allowSMS) {
      return NextResponse.json(
        { error: 'User has disabled SMS notifications' },
        { status: 400 }
      )
    }

    // Prepare recipient information
    const recipientInfo = {
      email: recipient.email || user.email,
      phone: recipient.phone || user.profile?.phone
    }

    // If scheduled for later, just create the notification record
    if (scheduleAt && new Date(scheduleAt) > new Date()) {
      const notification = new Notification({
        userId,
        type: actualType,
        category,
        recipient: actualType === 'email' ? recipientInfo.email : recipientInfo.phone,
        content: JSON.stringify(data),
        status: 'pending',
        metadata: {
          priority,
          scheduleAt: new Date(scheduleAt),
          templateUsed: category,
          ...data.metadata
        },
        preferences
      })

      await notification.save()

      return NextResponse.json({
        success: true,
        message: 'Notification scheduled successfully',
        notification: {
          id: notification._id,
          scheduledFor: scheduleAt,
          type: actualType,
          category,
          status: 'pending'
        }
      }, { status: 201 })
    }

    // Send immediate notification
    try {
      const sendResult = await sendNotification(actualType, category, recipientInfo, data)

      // Create notification record
      const notifications = []

      if (actualType === 'email' || actualType === 'both') {
        if (sendResult.email) {
          const emailNotification = new Notification({
            userId,
            type: 'email',
            category,
            recipient: recipientInfo.email,
            content: JSON.stringify(data),
            status: sendResult.email.success ? 'sent' : 'failed',
            sentAt: sendResult.email.success ? new Date() : undefined,
            failureReason: sendResult.email.success ? undefined : sendResult.email.error,
            deliveryAttempts: 1,
            lastAttemptAt: new Date(),
            metadata: {
              messageId: sendResult.email.messageId,
              priority,
              templateUsed: category,
              gatewayResponse: sendResult.email,
              ...data.metadata
            },
            preferences
          })

          await emailNotification.save()
          notifications.push({
            id: emailNotification._id,
            type: 'email',
            status: emailNotification.status,
            messageId: sendResult.email.messageId
          })
        }
      }

      if (actualType === 'sms' || actualType === 'both') {
        if (sendResult.sms) {
          const smsNotification = new Notification({
            userId,
            type: 'sms',
            category,
            recipient: recipientInfo.phone,
            content: JSON.stringify(data),
            status: sendResult.sms.success ? 'sent' : 'failed',
            sentAt: sendResult.sms.success ? new Date() : undefined,
            failureReason: sendResult.sms.success ? undefined : sendResult.sms.error,
            deliveryAttempts: 1,
            lastAttemptAt: new Date(),
            metadata: {
              messageId: sendResult.sms.messageId,
              priority,
              templateUsed: category,
              gatewayResponse: sendResult.sms,
              ...data.metadata
            },
            preferences
          })

          await smsNotification.save()
          notifications.push({
            id: smsNotification._id,
            type: 'sms',
            status: smsNotification.status,
            messageId: smsNotification.messageId
          })
        }
      }

      const hasFailures = notifications.some(n => n.status === 'failed')

      return NextResponse.json({
        success: !hasFailures,
        message: hasFailures ? 'Some notifications failed to send' : 'Notifications sent successfully',
        notifications,
        details: {
          email: sendResult.email,
          sms: sendResult.sms
        }
      }, { status: hasFailures ? 207 : 201 })

    } catch (error: any) {
      console.error('Error sending notification:', error)

      // Create failed notification record
      const failedNotification = new Notification({
        userId,
        type: actualType,
        category,
        recipient: actualType === 'email' ? recipientInfo.email : recipientInfo.phone,
        content: JSON.stringify(data),
        status: 'failed',
        failureReason: error.message,
        deliveryAttempts: 1,
        lastAttemptAt: new Date(),
        metadata: {
          priority,
          templateUsed: category,
          ...data.metadata
        },
        preferences
      })

      await failedNotification.save()

      return NextResponse.json({
        success: false,
        error: 'Failed to send notification',
        notification: {
          id: failedNotification._id,
          status: 'failed',
          reason: error.message
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/notifications/send - Get notification status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    let filter: any = { _id: notificationId }
    
    // Non-admin users can only see their own notifications
    if (session.user.role !== 'admin') {
      filter.userId = session.user.id
    }

    const notification = await Notification.findOne(filter)

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: notification._id,
        type: notification.type,
        category: notification.category,
        recipient: notification.recipient,
        status: notification.status,
        deliveryAttempts: notification.deliveryAttempts,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failureReason: notification.failureReason,
        lastAttemptAt: notification.lastAttemptAt,
        metadata: notification.metadata,
        createdAt: notification.createdAt
      }
    })

  } catch (error) {
    console.error('Error fetching notification status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}