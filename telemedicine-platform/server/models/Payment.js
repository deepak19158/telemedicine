const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  // Basic payment information
  paymentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Related entities
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral'
  },
  // Payment details
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
  // Payment method and gateway
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
  // Gateway-specific information
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
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  // Timestamps
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
  // Refund information
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
  // Commission tracking
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
  // Payment details for cash via agent
  cashCollectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cashCollectionDate: {
    type: Date
  },
  cashReceipt: {
    type: String,
    trim: true
  },
  // Failure information
  failureReason: {
    type: String,
    trim: true
  },
  failureCode: {
    type: String,
    trim: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  // Audit and metadata
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  notes: {
    type: String,
    trim: true
  },
  // Reconciliation
  reconciledAt: {
    type: Date
  },
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Retry information
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
paymentSchema.methods.generatePaymentId = function() {
  const prefix = 'PAY'
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function(gatewayResponse = null) {
  this.status = 'completed'
  this.completedAt = new Date()
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse
  }
}

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(reason, code = null, gatewayResponse = null) {
  this.status = 'failed'
  this.failedAt = new Date()
  this.failureReason = reason
  this.failureCode = code
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse
  }
}

// Method to initiate refund
paymentSchema.methods.initiateRefund = function(amount, reason) {
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
paymentSchema.methods.completeRefund = function(transactionId) {
  this.refundCompletedAt = new Date()
  this.refundTransactionId = transactionId
}

// Method to calculate commission
paymentSchema.methods.calculateCommission = function(commissionPercentage) {
  if (this.status === 'completed' && this.finalAmount > 0) {
    this.agentCommission = (this.finalAmount * commissionPercentage) / 100
    this.commissionStatus = 'calculated'
  }
}

// Method to mark commission as paid
paymentSchema.methods.markCommissionPaid = function() {
  this.commissionStatus = 'paid'
  this.commissionPaidAt = new Date()
}

// Method to retry payment
paymentSchema.methods.canRetry = function() {
  return this.retryCount < this.maxRetries && this.status === 'failed'
}

// Method to increment retry count
paymentSchema.methods.incrementRetry = function() {
  this.retryCount += 1
  this.lastRetryAt = new Date()
}

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
  return this.status === 'completed'
}

// Method to check if payment is refundable
paymentSchema.methods.isRefundable = function() {
  return this.status === 'completed' && this.refundAmount < this.finalAmount
}

// Static method to get payments by date range
paymentSchema.statics.getByDateRange = function(startDate, endDate, filter = {}) {
  return this.find({
    initiatedAt: {
      $gte: startDate,
      $lte: endDate
    },
    ...filter
  })
}

// Static method to get successful payments
paymentSchema.statics.getSuccessful = function(filter = {}) {
  return this.find({
    status: 'completed',
    ...filter
  })
}

// Static method to get failed payments
paymentSchema.statics.getFailed = function(filter = {}) {
  return this.find({
    status: 'failed',
    ...filter
  })
}

// Static method to get commission analytics
paymentSchema.statics.getCommissionAnalytics = function(agentId, startDate, endDate) {
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

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)

module.exports = Payment