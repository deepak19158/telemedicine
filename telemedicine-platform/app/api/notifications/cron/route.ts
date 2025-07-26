import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/db'
import { processScheduledNotifications } from '../../../../lib/notification-helper'

// POST /api/notifications/cron - Process scheduled notifications (cron job endpoint)
export async function POST(request: NextRequest) {
  try {
    // Add basic authentication to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-in-production'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    console.log('Processing scheduled notifications...')
    
    const result = await processScheduledNotifications()
    
    console.log(`Processed ${result.processed} scheduled notifications`)
    
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} scheduled notifications`,
      details: result
    })

  } catch (error) {
    console.error('Error in cron notification processing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/notifications/cron - Get cron job status and upcoming notifications
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-in-production'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const Notification = (await import('../../../../server/models/Notification')).default
    
    // Get pending scheduled notifications
    const now = new Date()
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
    
    const pendingNotifications = await Notification.find({
      status: 'pending',
      'metadata.scheduleAt': { $exists: true }
    }).select('category type metadata.scheduleAt createdAt userId')
    
    const dueNow = pendingNotifications.filter(n => 
      new Date(n.metadata.scheduleAt) <= now
    )
    
    const dueNextHour = pendingNotifications.filter(n => {
      const scheduleTime = new Date(n.metadata.scheduleAt)
      return scheduleTime > now && scheduleTime <= nextHour
    })
    
    // Get statistics
    const stats = await Notification.aggregate([
      {
        $match: {
          status: 'pending',
          'metadata.scheduleAt': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          nextScheduled: { $min: '$metadata.scheduleAt' }
        }
      },
      { $sort: { nextScheduled: 1 } }
    ])

    return NextResponse.json({
      success: true,
      statistics: {
        totalPending: pendingNotifications.length,
        dueNow: dueNow.length,
        dueNextHour: dueNextHour.length
      },
      categoryBreakdown: stats,
      upcomingNotifications: dueNextHour.map(n => ({
        id: n._id,
        category: n.category,
        type: n.type,
        scheduledFor: n.metadata.scheduleAt,
        userId: n.userId
      }))
    })

  } catch (error) {
    console.error('Error getting cron status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}