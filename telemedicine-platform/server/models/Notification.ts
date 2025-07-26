import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId
  type: 'email' | 'sms' | 'push'
  category: 'appointment_confirmation' | 'payment_confirmation' | 'appointment_reminder' | 'doctor_assignment' | 'referral_reward' | 'password_reset' | 'email_verification'
  recipient: string // email address or phone number
  subject?: string
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  deliveryAttempts: number
  lastAttemptAt?: Date
  sentAt?: Date
  deliveredAt?: Date
  failureReason?: string
  metadata?: {
    messageId?: string
    gatewayResponse?: any
    appointmentId?: mongoose.Types.ObjectId
    paymentId?: mongoose.Types.ObjectId
    referralId?: mongoose.Types.ObjectId
    templateUsed?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }
  preferences?: {
    allowEmail?: boolean
    allowSMS?: boolean
    allowPush?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'appointment_confirmation',
      'payment_confirmation', 
      'appointment_reminder',
      'doctor_assignment',
      'referral_reward',
      'password_reset',
      'email_verification'
    ],
    required: true
  },
  recipient: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'pending'
  },
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  lastAttemptAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  },
  metadata: {
    messageId: String,
    gatewayResponse: Schema.Types.Mixed,
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment'
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral'
    },
    templateUsed: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    }
  },
  preferences: {
    allowEmail: {
      type: Boolean,
      default: true
    },
    allowSMS: {
      type: Boolean,
      default: true
    },
    allowPush: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ status: 1, createdAt: 1 })
notificationSchema.index({ type: 1, category: 1 })
notificationSchema.index({ recipient: 1 })
notificationSchema.index({ 'metadata.appointmentId': 1 })
notificationSchema.index({ 'metadata.paymentId': 1 })

// Static methods
notificationSchema.statics.createNotification = function(data: Partial<INotification>) {
  return new this(data)
}

notificationSchema.statics.getByUser = function(userId: mongoose.Types.ObjectId, options: any = {}) {
  const { page = 1, limit = 20, type, category, status } = options
  
  let filter: any = { userId }
  if (type) filter.type = type
  if (category) filter.category = category
  if (status) filter.status = status
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
}

notificationSchema.statics.getStatsByUser = function(userId: mongoose.Types.ObjectId) {
  return this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ])
}

notificationSchema.statics.getFailedNotifications = function(maxAttempts: number = 3) {
  return this.find({
    status: 'failed',
    deliveryAttempts: { $lt: maxAttempts },
    lastAttemptAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes ago
  }).limit(100)
}

// Instance methods
notificationSchema.methods.markAsSent = function(messageId?: string) {
  this.status = 'sent'
  this.sentAt = new Date()
  this.deliveryAttempts += 1
  this.lastAttemptAt = new Date()
  if (messageId) {
    this.metadata = { ...this.metadata, messageId }
  }
  return this.save()
}

notificationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered'
  this.deliveredAt = new Date()
  return this.save()
}

notificationSchema.methods.markAsFailed = function(reason: string) {
  this.status = 'failed'
  this.failureReason = reason
  this.deliveryAttempts += 1
  this.lastAttemptAt = new Date()
  return this.save()
}

notificationSchema.methods.retry = function() {
  if (this.deliveryAttempts >= 3) {
    throw new Error('Maximum retry attempts exceeded')
  }
  this.status = 'pending'
  this.failureReason = undefined
  return this.save()
}

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema)

export default Notification