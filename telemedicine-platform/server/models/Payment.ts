import mongoose, { Schema, Document } from 'mongoose'

export interface IPayment extends Document {
  paymentId: string
  userId: mongoose.Types.ObjectId
  appointmentId: mongoose.Types.ObjectId
  agentId?: mongoose.Types.ObjectId
  referralId?: mongoose.Types.ObjectId
  amount: number
  discount: number
  discountType: 'percentage' | 'fixed' | 'referral'
  finalAmount: number
  currency: string
  paymentMethod: 'razorpay' | 'payu' | 'cash_via_agent' | 'wallet' | 'upi' | 'card' | 'netbanking'
  paymentGateway: 'razorpay' | 'payu' | 'manual'
  gatewayPaymentId?: string
  gatewayOrderId?: string
  transactionId?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
  initiatedAt: Date
  completedAt?: Date
  failedAt?: Date
  cancelledAt?: Date
  refundAmount: number
  refundReason?: string
  refundInitiatedAt?: Date
  refundCompletedAt?: Date
  refundTransactionId?: string
  agentCommission: number
  commissionStatus: 'pending' | 'calculated' | 'paid' | 'on_hold'
  commissionPaidAt?: Date
  cashCollectedBy?: mongoose.Types.ObjectId
  cashCollectionDate?: Date
  cashReceipt?: string
  failureReason?: string
  failureCode?: string
  gatewayResponse?: any
  ipAddress?: string
  userAgent?: string
  metadata?: any
  notes?: string
  reconciledAt?: Date
  reconciledBy?: mongoose.Types.ObjectId
  retryCount: number
  lastRetryAt?: Date
  maxRetries: number
  createdAt: Date
  updatedAt: Date
  
  // Virtual properties
  netAmount: number
  discountPercentage: number
  paymentDuration: number | null
  refundPercentage: number
  
  // Methods
  generatePaymentId(): string
  markCompleted(gatewayResponse?: any): void
  markFailed(reason: string, code?: string, gatewayResponse?: any): void
  initiateRefund(amount: number, reason: string): void
  completeRefund(transactionId: string): void
  calculateCommission(commissionPercentage: number): void
  markCommissionPaid(): void
  canRetry(): boolean
  incrementRetry(): void
  isSuccessful(): boolean
  isRefundable(): boolean
}

const paymentSchema = new Schema<IPayment>({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  referralId: {
    type: Schema.Types.ObjectId,
    ref: 'Referral'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'referral'],
    default: 'fixed'
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'payu', 'cash_via_agent', 'wallet', 'upi', 'card', 'netbanking'],
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'payu', 'manual'],
    required: true
  },
  gatewayPaymentId: {
    type: String,
    trim: true
  },
  gatewayOrderId: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundReason: {
    type: String,
    trim: true
  },
  refundInitiatedAt: {
    type: Date
  },
  refundCompletedAt: {
    type: Date
  },
  refundTransactionId: {
    type: String,
    trim: true
  },
  agentCommission: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionStatus: {
    type: String,
    enum: ['pending', 'calculated', 'paid', 'on_hold'],
    default: 'pending'
  },
  commissionPaidAt: {
    type: Date
  },
  cashCollectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  cashCollectionDate: {
    type: Date
  },
  cashReceipt: {
    type: String,
    trim: true
  },
  failureReason: {
    type: String,
    trim: true
  },
  failureCode: {
    type: String,
    trim: true
  },
  gatewayResponse: {
    type: Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  notes: {
    type: String,
    trim: true
  },
  reconciledAt: {
    type: Date
  },
  reconciledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: {
    type: Date
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
paymentSchema.index({ paymentId: 1 })
paymentSchema.index({ userId: 1 })
paymentSchema.index({ appointmentId: 1 })
paymentSchema.index({ agentId: 1 })
paymentSchema.index({ status: 1 })
paymentSchema.index({ paymentMethod: 1 })
paymentSchema.index({ paymentGateway: 1 })
paymentSchema.index({ gatewayPaymentId: 1 })
paymentSchema.index({ transactionId: 1 })
paymentSchema.index({ initiatedAt: 1 })
paymentSchema.index({ completedAt: 1 })
paymentSchema.index({ commissionStatus: 1 })

// Virtual for net amount after refund
paymentSchema.virtual('netAmount').get(function() {
  return this.finalAmount - this.refundAmount
})

// Virtual for discount percentage
paymentSchema.virtual('discountPercentage').get(function() {
  if (this.amount === 0) return 0
  return (this.discount / this.amount) * 100
})

// Virtual for payment duration
paymentSchema.virtual('paymentDuration').get(function() {
  if (!this.completedAt) return null
  return this.completedAt.getTime() - this.initiatedAt.getTime()
})

// Virtual for refund percentage
paymentSchema.virtual('refundPercentage').get(function() {
  if (this.finalAmount === 0) return 0
  return (this.refundAmount / this.finalAmount) * 100
})

// Pre-save middleware to generate payment ID
paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.paymentId) {
    this.paymentId = this.generatePaymentId()
  }
  next()
})

// Method to generate payment ID
paymentSchema.methods.generatePaymentId = function(): string {
  const prefix = 'PAY'
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function(gatewayResponse: any = null): void {
  this.status = 'completed'
  this.completedAt = new Date()
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse
  }
}

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(reason: string, code?: string, gatewayResponse?: any): void {
  this.status = 'failed'
  this.failedAt = new Date()
  this.failureReason = reason
  this.failureCode = code
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse
  }
}

// Method to initiate refund
paymentSchema.methods.initiateRefund = function(amount: number, reason: string): void {
  if (this.status !== 'completed') {
    throw new Error('Cannot refund incomplete payment')
  }
  
  if (amount > this.finalAmount - this.refundAmount) {
    throw new Error('Refund amount exceeds available amount')
  }
  
  this.refundAmount = (this.refundAmount || 0) + amount
  this.refundReason = reason
  this.refundInitiatedAt = new Date()
  
  if (this.refundAmount >= this.finalAmount) {
    this.status = 'refunded'
  } else {
    this.status = 'partially_refunded'
  }
}

// Method to complete refund
paymentSchema.methods.completeRefund = function(transactionId: string): void {
  this.refundCompletedAt = new Date()
  this.refundTransactionId = transactionId
}

// Method to calculate commission
paymentSchema.methods.calculateCommission = function(commissionPercentage: number): void {
  if (this.status === 'completed' && this.finalAmount > 0) {
    this.agentCommission = (this.finalAmount * commissionPercentage) / 100
    this.commissionStatus = 'calculated'
  }
}

// Method to mark commission as paid
paymentSchema.methods.markCommissionPaid = function(): void {
  this.commissionStatus = 'paid'
  this.commissionPaidAt = new Date()
}

// Method to retry payment
paymentSchema.methods.canRetry = function(): boolean {
  return this.retryCount < this.maxRetries && this.status === 'failed'
}

// Method to increment retry count
paymentSchema.methods.incrementRetry = function(): void {
  this.retryCount += 1
  this.lastRetryAt = new Date()
}

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function(): boolean {
  return this.status === 'completed'
}

// Method to check if payment is refundable
paymentSchema.methods.isRefundable = function(): boolean {
  return this.status === 'completed' && this.refundAmount < this.finalAmount
}

// Static method to get payments by date range
paymentSchema.statics.getByDateRange = function(startDate: Date, endDate: Date, filter: object = {}) {
  return this.find({
    initiatedAt: {
      $gte: startDate,
      $lte: endDate
    },
    ...filter
  })
}

// Static method to get successful payments
paymentSchema.statics.getSuccessful = function(filter: object = {}) {
  return this.find({
    status: 'completed',
    ...filter
  })
}

// Static method to get failed payments
paymentSchema.statics.getFailed = function(filter: object = {}) {
  return this.find({
    status: 'failed',
    ...filter
  })
}

// Static method to get commission analytics
paymentSchema.statics.getCommissionAnalytics = function(agentId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        agentId: agentId,
        status: 'completed',
        initiatedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' },
        totalCommission: { $sum: '$agentCommission' },
        avgCommission: { $avg: '$agentCommission' }
      }
    }
  ])
}

const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema)

export default Payment