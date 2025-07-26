import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// GET /api/notifications/preferences - Get user notification preferences
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
    
    const user = await User.findById(session.user.id)
      .select('profile.notificationPreferences email profile.phone')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Default preferences if not set
    const defaultPreferences = {
      allowEmail: true,
      allowSMS: true,
      allowPush: true,
      categories: {
        appointment_confirmation: { email: true, sms: true },
        payment_confirmation: { email: true, sms: true },
        appointment_reminder: { email: true, sms: true },
        doctor_assignment: { email: true, sms: false },
        referral_reward: { email: true, sms: false },
        password_reset: { email: true, sms: false },
        email_verification: { email: true, sms: false }
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      frequency: {
        promotional: 'weekly',
        reminders: 'all'
      }
    }

    const currentPreferences = user.profile?.notificationPreferences || defaultPreferences

    return NextResponse.json({
      success: true,
      preferences: currentPreferences,
      contactInfo: {
        email: user.email,
        phone: user.profile?.phone,
        hasEmail: !!user.email,
        hasPhone: !!user.profile?.phone
      }
    })

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
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
    const { preferences } = body

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences object is required' },
        { status: 400 }
      )
    }

    // Validate preferences structure
    const validCategories = [
      'appointment_confirmation',
      'payment_confirmation', 
      'appointment_reminder',
      'doctor_assignment',
      'referral_reward',
      'password_reset',
      'email_verification'
    ]

    // Validate category preferences if provided
    if (preferences.categories) {
      for (const category of Object.keys(preferences.categories)) {
        if (!validCategories.includes(category)) {
          return NextResponse.json(
            { error: `Invalid notification category: ${category}` },
            { status: 400 }
          )
        }
      }
    }

    // Validate time format for quiet hours
    if (preferences.quietHours?.startTime && preferences.quietHours?.endTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(preferences.quietHours.startTime) || 
          !timeRegex.test(preferences.quietHours.endTime)) {
        return NextResponse.json(
          { error: 'Invalid time format for quiet hours. Use HH:MM format.' },
          { status: 400 }
        )
      }
    }

    const user = await User.findById(session.user.id)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update notification preferences
    user.profile = user.profile || {}
    user.profile.notificationPreferences = {
      ...user.profile.notificationPreferences,
      ...preferences
    }

    user.updatedAt = new Date()
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: user.profile.notificationPreferences
    })

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/preferences/reset - Reset to default preferences
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
    
    const user = await User.findById(session.user.id)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Reset to default preferences
    const defaultPreferences = {
      allowEmail: true,
      allowSMS: true,
      allowPush: true,
      categories: {
        appointment_confirmation: { email: true, sms: true },
        payment_confirmation: { email: true, sms: true },
        appointment_reminder: { email: true, sms: true },
        doctor_assignment: { email: true, sms: false },
        referral_reward: { email: true, sms: false },
        password_reset: { email: true, sms: false },
        email_verification: { email: true, sms: false }
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      frequency: {
        promotional: 'weekly',
        reminders: 'all'
      }
    }

    user.profile = user.profile || {}
    user.profile.notificationPreferences = defaultPreferences
    user.updatedAt = new Date()
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Notification preferences reset to defaults',
      preferences: defaultPreferences
    })

  } catch (error) {
    console.error('Error resetting notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}