import { sendNotification } from './notifications'
import Notification from '../server/models/Notification'
import User from '../server/models/User'

/**
 * Helper functions to integrate notifications with appointment and payment workflows
 */

export interface NotificationData {
  userId: string
  type?: 'email' | 'sms' | 'both'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  scheduleAt?: Date
}

export interface AppointmentNotificationData {
  patientName: string
  doctorName: string
  specialization: string
  appointmentDate: Date | string
  consultationType: string
  amount: number
  referralCode?: string
  appointmentId?: string
}

export interface PaymentNotificationData {
  patientName: string
  doctorName: string
  transactionId: string
  amount: number
  paymentMethod: string
  paidAt: Date | string
  appointmentDate: Date | string
  consultationType: string
  discount?: number
}

export interface DoctorAssignmentData {
  patientName: string
  doctorName: string
  specialization: string
  experience: number
  consultationFee: number
}

export interface ReferralRewardData {
  agentName: string
  commissionAmount: number
  referralCode: string
  patientName: string
  appointmentAmount: number
  commissionRate: number
}

/**
 * Send appointment confirmation notification
 */
export async function sendAppointmentConfirmation(
  data: NotificationData & { appointmentData: AppointmentNotificationData }
) {
  try {
    const user = await User.findById(data.userId)
      .select('email profile.phone profile.notificationPreferences')

    if (!user) {
      throw new Error('User not found')
    }

    const type = data.type || 'both'
    const recipient = {
      email: user.email,
      phone: user.profile?.phone
    }

    // Check if scheduled or immediate
    if (data.scheduleAt && new Date(data.scheduleAt) > new Date()) {
      // Create scheduled notification
      const notification = new Notification({
        userId: data.userId,
        type,
        category: 'appointment_confirmation',
        recipient: type === 'email' ? recipient.email : recipient.phone,
        content: JSON.stringify(data.appointmentData),
        status: 'pending',
        metadata: {
          priority: data.priority || 'normal',
          scheduleAt: data.scheduleAt,
          templateUsed: 'appointment_confirmation',
          appointmentId: data.appointmentData.appointmentId
        }
      })

      await notification.save()
      return { success: true, scheduled: true, notificationId: notification._id }
    }

    // Send immediate notification
    const result = await sendNotification(type, 'appointment_confirmation', recipient, data.appointmentData)

    // Save to database
    const notifications = []

    if (type === 'email' || type === 'both') {
      if (result.email) {
        const emailNotification = new Notification({
          userId: data.userId,
          type: 'email',
          category: 'appointment_confirmation',
          recipient: recipient.email,
          content: JSON.stringify(data.appointmentData),
          status: result.email.success ? 'sent' : 'failed',
          sentAt: result.email.success ? new Date() : undefined,
          failureReason: result.email.success ? undefined : result.email.error,
          deliveryAttempts: 1,
          lastAttemptAt: new Date(),
          metadata: {
            messageId: result.email.messageId,
            priority: data.priority || 'normal',
            templateUsed: 'appointment_confirmation',
            appointmentId: data.appointmentData.appointmentId
          }
        })

        await emailNotification.save()
        notifications.push(emailNotification._id)
      }
    }

    if (type === 'sms' || type === 'both') {
      if (result.sms) {
        const smsNotification = new Notification({
          userId: data.userId,
          type: 'sms',
          category: 'appointment_confirmation',
          recipient: recipient.phone,
          content: JSON.stringify(data.appointmentData),
          status: result.sms.success ? 'sent' : 'failed',
          sentAt: result.sms.success ? new Date() : undefined,
          failureReason: result.sms.success ? undefined : result.sms.error,
          deliveryAttempts: 1,
          lastAttemptAt: new Date(),
          metadata: {
            messageId: result.sms.messageId,
            priority: data.priority || 'normal',
            templateUsed: 'appointment_confirmation',
            appointmentId: data.appointmentData.appointmentId
          }
        })

        await smsNotification.save()
        notifications.push(smsNotification._id)
      }
    }

    return {
      success: true,
      notifications,
      results: result
    }

  } catch (error: any) {
    console.error('Error sending appointment confirmation:', error)
    throw new Error(`Failed to send appointment confirmation: ${error.message}`)
  }
}

/**
 * Send payment confirmation notification
 */
export async function sendPaymentConfirmation(
  data: NotificationData & { paymentData: PaymentNotificationData }
) {
  try {
    const user = await User.findById(data.userId)
      .select('email profile.phone profile.notificationPreferences')

    if (!user) {
      throw new Error('User not found')
    }

    const type = data.type || 'both'
    const recipient = {
      email: user.email,
      phone: user.profile?.phone
    }

    const result = await sendNotification(type, 'payment_confirmation', recipient, data.paymentData)

    // Save to database
    const notifications = []

    if (type === 'email' || type === 'both') {
      if (result.email) {
        const emailNotification = new Notification({
          userId: data.userId,
          type: 'email',
          category: 'payment_confirmation',
          recipient: recipient.email,
          content: JSON.stringify(data.paymentData),
          status: result.email.success ? 'sent' : 'failed',
          sentAt: result.email.success ? new Date() : undefined,
          failureReason: result.email.success ? undefined : result.email.error,
          deliveryAttempts: 1,
          lastAttemptAt: new Date(),
          metadata: {
            messageId: result.email.messageId,
            priority: data.priority || 'high',
            templateUsed: 'payment_confirmation'
          }
        })

        await emailNotification.save()
        notifications.push(emailNotification._id)
      }
    }

    if (type === 'sms' || type === 'both') {
      if (result.sms) {
        const smsNotification = new Notification({
          userId: data.userId,
          type: 'sms',
          category: 'payment_confirmation',
          recipient: recipient.phone,
          content: JSON.stringify(data.paymentData),
          status: result.sms.success ? 'sent' : 'failed',
          sentAt: result.sms.success ? new Date() : undefined,
          failureReason: result.sms.success ? undefined : result.sms.error,
          deliveryAttempts: 1,
          lastAttemptAt: new Date(),
          metadata: {
            messageId: result.sms.messageId,
            priority: data.priority || 'high',
            templateUsed: 'payment_confirmation'
          }
        })

        await smsNotification.save()
        notifications.push(smsNotification._id)
      }
    }

    return {
      success: true,
      notifications,
      results: result
    }

  } catch (error: any) {
    console.error('Error sending payment confirmation:', error)
    throw new Error(`Failed to send payment confirmation: ${error.message}`)
  }
}

/**
 * Send appointment reminder (usually scheduled 24 hours before)
 */
export async function sendAppointmentReminder(
  data: NotificationData & { appointmentData: AppointmentNotificationData }
) {
  try {
    const user = await User.findById(data.userId)
      .select('email profile.phone profile.notificationPreferences')

    if (!user) {
      throw new Error('User not found')
    }

    const type = data.type || 'both'
    const recipient = {
      email: user.email,
      phone: user.profile?.phone
    }

    const result = await sendNotification(type, 'appointment_reminder', recipient, data.appointmentData)

    return {
      success: true,
      results: result
    }

  } catch (error: any) {
    console.error('Error sending appointment reminder:', error)
    throw new Error(`Failed to send appointment reminder: ${error.message}`)
  }
}

/**
 * Send doctor assignment notification
 */
export async function sendDoctorAssignmentNotification(
  data: NotificationData & { assignmentData: DoctorAssignmentData }
) {
  try {
    const user = await User.findById(data.userId)
      .select('email profile.phone profile.notificationPreferences')

    if (!user) {
      throw new Error('User not found')
    }

    const type = data.type || 'both'
    const recipient = {
      email: user.email,
      phone: user.profile?.phone
    }

    const result = await sendNotification(type, 'doctor_assignment', recipient, data.assignmentData)

    return {
      success: true,
      results: result
    }

  } catch (error: any) {
    console.error('Error sending doctor assignment notification:', error)
    throw new Error(`Failed to send doctor assignment notification: ${error.message}`)
  }
}

/**
 * Send referral reward notification to agent
 */
export async function sendReferralRewardNotification(
  data: NotificationData & { rewardData: ReferralRewardData }
) {
  try {
    const user = await User.findById(data.userId)
      .select('email profile.phone profile.notificationPreferences')

    if (!user) {
      throw new Error('User not found')
    }

    const type = data.type || 'email' // Prefer email for rewards
    const recipient = {
      email: user.email,
      phone: user.profile?.phone
    }

    const result = await sendNotification(type, 'referral_reward', recipient, data.rewardData)

    return {
      success: true,
      results: result
    }

  } catch (error: any) {
    console.error('Error sending referral reward notification:', error)
    throw new Error(`Failed to send referral reward notification: ${error.message}`)
  }
}

/**
 * Schedule appointment reminder (24 hours before appointment)
 */
export async function scheduleAppointmentReminder(
  appointmentDate: Date,
  userId: string,
  appointmentData: AppointmentNotificationData
) {
  try {
    // Schedule for 24 hours before appointment
    const reminderTime = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000)
    
    // Only schedule if appointment is more than 24 hours away
    if (reminderTime > new Date()) {
      const notification = new Notification({
        userId,
        type: 'both',
        category: 'appointment_reminder',
        recipient: 'scheduled', // Will be resolved when sent
        content: JSON.stringify(appointmentData),
        status: 'pending',
        metadata: {
          priority: 'normal',
          scheduleAt: reminderTime,
          templateUsed: 'appointment_reminder',
          appointmentId: appointmentData.appointmentId,
          isReminder: true
        }
      })

      await notification.save()
      return { success: true, reminderScheduled: true, reminderTime, notificationId: notification._id }
    }

    return { success: true, reminderScheduled: false, reason: 'Appointment too soon for reminder' }

  } catch (error: any) {
    console.error('Error scheduling appointment reminder:', error)
    throw new Error(`Failed to schedule appointment reminder: ${error.message}`)
  }
}

/**
 * Process scheduled notifications (to be called by a cron job)
 */
export async function processScheduledNotifications() {
  try {
    const now = new Date()
    
    // Find notifications scheduled for now or earlier
    const scheduledNotifications = await Notification.find({
      status: 'pending',
      'metadata.scheduleAt': { $lte: now }
    }).populate('userId', 'email profile.phone profile.notificationPreferences')

    const results = []

    for (const notification of scheduledNotifications) {
      try {
        const user = notification.userId
        const notificationData = JSON.parse(notification.content)
        
        const recipient = {
          email: user.email,
          phone: user.profile?.phone
        }

        const result = await sendNotification(
          notification.type as 'email' | 'sms' | 'both',
          notification.category as any,
          recipient,
          notificationData
        )

        const sendResult = result[notification.type as 'email' | 'sms']

        if (sendResult?.success) {
          notification.status = 'sent'
          notification.sentAt = new Date()
          notification.metadata = {
            ...notification.metadata,
            messageId: sendResult.messageId,
            processedAt: new Date()
          }
        } else {
          notification.status = 'failed'
          notification.failureReason = sendResult?.error || 'Unknown error'
        }

        notification.deliveryAttempts = 1
        notification.lastAttemptAt = new Date()
        await notification.save()

        results.push({
          id: notification._id,
          category: notification.category,
          type: notification.type,
          success: sendResult?.success || false,
          error: sendResult?.error
        })

      } catch (error: any) {
        console.error('Error processing scheduled notification:', notification._id, error)
        
        notification.status = 'failed'
        notification.failureReason = error.message
        notification.deliveryAttempts = 1
        notification.lastAttemptAt = new Date()
        await notification.save()

        results.push({
          id: notification._id,
          category: notification.category,
          type: notification.type,
          success: false,
          error: error.message
        })
      }
    }

    return {
      success: true,
      processed: results.length,
      results
    }

  } catch (error: any) {
    console.error('Error processing scheduled notifications:', error)
    throw new Error(`Failed to process scheduled notifications: ${error.message}`)
  }
}