import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Notification from '../../../../server/models/Notification'

// GET /api/notifications/history - Get notification history
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
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build filter based on user role
    let filter: any = {}

    if (session.user.role !== 'admin') {
      filter.userId = session.user.id
    }

    // Add additional filters
    if (type && type !== 'all') {
      filter.type = type
    }

    if (category && category !== 'all') {
      filter.category = category
    }

    if (status && status !== 'all') {
      filter.status = status
    }

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    // Get notifications with pagination
    const notifications = await Notification.find(filter)
      .populate('userId', 'profile.name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const totalNotifications = await Notification.countDocuments(filter)

    // Calculate summary statistics
    const summaryStats = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          sentNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          deliveredNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failedNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          emailNotifications: {
            $sum: { $cond: [{ $eq: ['$type', 'email'] }, 1, 0] }
          },
          smsNotifications: {
            $sum: { $cond: [{ $eq: ['$type', 'sms'] }, 1, 0] }
          },
          totalAttempts: { $sum: '$deliveryAttempts' }
        }
      }
    ])

    const summary = summaryStats[0] || {
      totalNotifications: 0,
      sentNotifications: 0,
      deliveredNotifications: 0,
      failedNotifications: 0,
      pendingNotifications: 0,
      emailNotifications: 0,
      smsNotifications: 0,
      totalAttempts: 0
    }

    // Calculate success rate
    summary.successRate = summary.totalNotifications > 0 
      ? ((summary.sentNotifications + summary.deliveredNotifications) / summary.totalNotifications * 100).toFixed(2)
      : '0.00'

    // Get category breakdown
    const categoryStats = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Format notification data for response
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id,
      type: notification.type,
      category: notification.category,
      recipient: notification.recipient,
      subject: notification.subject,
      status: notification.status,
      deliveryAttempts: notification.deliveryAttempts,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      failureReason: notification.failureReason,
      lastAttemptAt: notification.lastAttemptAt,
      createdAt: notification.createdAt,
      metadata: {
        priority: notification.metadata?.priority,
        templateUsed: notification.metadata?.templateUsed,
        messageId: notification.metadata?.messageId
      },
      user: session.user.role === 'admin' ? {
        id: notification.userId._id,
        name: notification.userId.profile?.name,
        email: notification.userId.email
      } : null
    }))

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      summary,
      categoryStats,
      pagination: {
        current: page,
        pages: Math.ceil(totalNotifications / limit),
        total: totalNotifications,
        limit
      },
      filters: {
        type,
        category,
        status,
        startDate,
        endDate,
        userRole: session.user.role
      }
    })

  } catch (error) {
    console.error('Error fetching notification history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/history - Delete notification (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
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

    const notification = await Notification.findById(notificationId)

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    await Notification.findByIdAndDelete(notificationId)

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}