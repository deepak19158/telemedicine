import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Notification from '../../../../server/models/Notification'
import User from '../../../../server/models/User'
import { sendNotification } from '../../../../lib/notifications'

// POST /api/notifications/retry - Retry failed notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can retry failed notifications
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const { notificationId, maxRetries = 3 } = body

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    const notification = await Notification.findById(notificationId)
      .populate('userId', 'email profile.phone profile.notificationPreferences')

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Check if notification is eligible for retry
    if (notification.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed notifications can be retried' },
        { status: 400 }
      )
    }

    if (notification.deliveryAttempts >= maxRetries) {
      return NextResponse.json(
        { error: `Maximum retry attempts (${maxRetries}) exceeded` },
        { status: 400 }
      )
    }

    // Check if too recent (wait at least 5 minutes between retries)
    const lastAttempt = new Date(notification.lastAttemptAt)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    if (lastAttempt > fiveMinutesAgo) {
      return NextResponse.json(
        { error: 'Please wait at least 5 minutes between retry attempts' },
        { status: 429 }
      )
    }

    // Parse notification data
    let notificationData
    try {
      notificationData = JSON.parse(notification.content)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid notification data format' },
        { status: 400 }
      )
    }

    // Prepare recipient information
    const user = notification.userId
    const recipientInfo = {
      email: notification.type === 'email' ? notification.recipient : user.email,
      phone: notification.type === 'sms' ? notification.recipient : user.profile?.phone
    }

    // Check if user still allows this type of notification
    const preferences = user.profile?.notificationPreferences || {}
    if (notification.type === 'email' && preferences.allowEmail === false) {
      notification.status = 'cancelled'
      notification.failureReason = 'User disabled email notifications'
      await notification.save()

      return NextResponse.json({
        success: false,
        error: 'User has disabled email notifications'
      }, { status: 400 })
    }

    if (notification.type === 'sms' && preferences.allowSMS === false) {
      notification.status = 'cancelled'
      notification.failureReason = 'User disabled SMS notifications'
      await notification.save()

      return NextResponse.json({
        success: false,
        error: 'User has disabled SMS notifications'
      }, { status: 400 })
    }

    // Attempt to resend
    try {
      const sendResult = await sendNotification(
        notification.type, 
        notification.category, 
        recipientInfo, 
        notificationData
      )

      const result = sendResult[notification.type as 'email' | 'sms']

      if (result?.success) {
        // Update notification as sent
        notification.status = 'sent'
        notification.sentAt = new Date()
        notification.deliveryAttempts += 1
        notification.lastAttemptAt = new Date()
        notification.failureReason = undefined
        notification.metadata = {
          ...notification.metadata,
          messageId: result.messageId,
          retryAttempt: notification.deliveryAttempts,
          retriedBy: session.user.id,
          retriedAt: new Date()
        }
        
        await notification.save()

        return NextResponse.json({
          success: true,
          message: 'Notification sent successfully on retry',
          notification: {
            id: notification._id,
            status: notification.status,
            attempts: notification.deliveryAttempts,
            messageId: result.messageId
          }
        })
      } else {
        // Update failure info
        notification.deliveryAttempts += 1
        notification.lastAttemptAt = new Date()
        notification.failureReason = result?.error || 'Unknown error'
        notification.metadata = {
          ...notification.metadata,
          retryAttempt: notification.deliveryAttempts,
          retriedBy: session.user.id,
          retriedAt: new Date(),
          lastRetryError: result?.error
        }
        
        await notification.save()

        return NextResponse.json({
          success: false,
          error: 'Retry failed',
          notification: {
            id: notification._id,
            status: notification.status,
            attempts: notification.deliveryAttempts,
            reason: notification.failureReason
          }
        }, { status: 500 })
      }

    } catch (error: any) {
      console.error('Error during notification retry:', error)

      // Update failure info
      notification.deliveryAttempts += 1
      notification.lastAttemptAt = new Date()
      notification.failureReason = error.message
      notification.metadata = {
        ...notification.metadata,
        retryAttempt: notification.deliveryAttempts,
        retriedBy: session.user.id,
        retriedAt: new Date(),
        lastRetryError: error.message
      }
      
      await notification.save()

      return NextResponse.json({
        success: false,
        error: 'Retry failed due to system error',
        notification: {
          id: notification._id,
          status: notification.status,
          attempts: notification.deliveryAttempts,
          reason: error.message
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in notification retry API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/notifications/retry - Get failed notifications eligible for retry
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can view retry queue
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const maxAttempts = parseInt(searchParams.get('maxAttempts') || '3')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get failed notifications that can be retried
    const failedNotifications = await Notification.find({
      status: 'failed',
      deliveryAttempts: { $lt: maxAttempts },
      lastAttemptAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // At least 5 minutes old
    })
    .populate('userId', 'profile.name email')
    .sort({ lastAttemptAt: 1 }) // Oldest first
    .skip((page - 1) * limit)
    .limit(limit)

    const totalFailed = await Notification.countDocuments({
      status: 'failed',
      deliveryAttempts: { $lt: maxAttempts },
      lastAttemptAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
    })

    // Get summary statistics
    const retryStats = await Notification.aggregate([
      {
        $match: {
          status: 'failed'
        }
      },
      {
        $group: {
          _id: null,
          totalFailed: { $sum: 1 },
          eligibleForRetry: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$deliveryAttempts', maxAttempts] },
                    { $lt: ['$lastAttemptAt', new Date(Date.now() - 5 * 60 * 1000)] }
                  ]
                },
                1,
                0
              ]
            }
          },
          maxAttemptsReached: {
            $sum: {
              $cond: [{ $gte: ['$deliveryAttempts', maxAttempts] }, 1, 0]
            }
          }
        }
      }
    ])

    const stats = retryStats[0] || {
      totalFailed: 0,
      eligibleForRetry: 0,
      maxAttemptsReached: 0
    }

    const formattedNotifications = failedNotifications.map(notification => ({
      id: notification._id,
      type: notification.type,
      category: notification.category,
      recipient: notification.recipient,
      status: notification.status,
      deliveryAttempts: notification.deliveryAttempts,
      maxAttempts: maxAttempts,
      remainingAttempts: maxAttempts - notification.deliveryAttempts,
      lastAttemptAt: notification.lastAttemptAt,
      failureReason: notification.failureReason,
      createdAt: notification.createdAt,
      user: {
        id: notification.userId._id,
        name: notification.userId.profile?.name,
        email: notification.userId.email
      },
      canRetryNow: notification.lastAttemptAt < new Date(Date.now() - 5 * 60 * 1000)
    }))

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      statistics: stats,
      pagination: {
        current: page,
        pages: Math.ceil(totalFailed / limit),
        total: totalFailed,
        limit
      }
    })

  } catch (error) {
    console.error('Error fetching retry queue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}