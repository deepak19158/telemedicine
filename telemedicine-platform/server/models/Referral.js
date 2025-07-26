const mongoose = require('mongoose')

const referralSchema = new mongoose.Schema({
  // Agent information
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Referral code details
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  // Discount configuration
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  // Commission configuration
  commissionType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  commissionValue: {
    type: Number,
    required: true,
    min: 0
  },
  // Usage limits
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: null // null means unlimited
  },
  maxUsagePerUser: {
    type: Number,
    default: 1
  },
  // Validity
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    required: true
  },
  // Admin assignment
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  // Targeting
  targetUserRoles: [{
    type: String,
    enum: ['patient', 'doctor', 'agent'],
    default: 'patient'
  }],
  targetRegions: [{
    type: String,
    trim: true
  }],
  // Analytics
  totalReferrals: {
    type: Number,
    default: 0
  },
  successfulReferrals: {
    type: Number,
    default: 0
  },
  totalCommissionEarned: {
    type: Number,
    default: 0
  },
  totalDiscountGiven: {
    type: Number,
    default: 0
  },
  // Metadata
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  lastUsedAt: {
    type: Date
  },
  deactivatedAt: {
    type: Date
  },
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deactivationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
referralSchema.index({ code: 1 })
referralSchema.index({ agentId: 1 })
referralSchema.index({ assignedBy: 1 })
referralSchema.index({ isActive: 1, expirationDate: 1 })
referralSchema.index({ startDate: 1, expirationDate: 1 })

// Virtual for referral status
referralSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive'
  if (this.expirationDate < new Date()) return 'expired'
  if (this.maxUsage && this.usageCount >= this.maxUsage) return 'exhausted'
  return 'active'
})

// Virtual for conversion rate
referralSchema.virtual('conversionRate').get(function() {
  if (this.totalReferrals === 0) return 0
  return (this.successfulReferrals / this.totalReferrals) * 100
})

// Virtual for average commission per referral
referralSchema.virtual('avgCommissionPerReferral').get(function() {
  if (this.successfulReferrals === 0) return 0
  return this.totalCommissionEarned / this.successfulReferrals
})

// Pre-save middleware to generate code if not provided
referralSchema.pre('save', function(next) {
  if (this.isNew && !this.code) {
    this.code = this.generateReferralCode()
  }
  next()
})

// Method to generate referral code
referralSchema.methods.generateReferralCode = function() {
  const prefix = 'REF'
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

// Method to check if referral is valid
referralSchema.methods.isValid = function() {
  const now = new Date()
  return this.isActive && 
         this.startDate <= now && 
         this.expirationDate >= now &&
         (!this.maxUsage || this.usageCount < this.maxUsage)
}

// Method to check if user can use this referral
referralSchema.methods.canUserUse = function(userId) {
  // This would need to check usage history
  return this.isValid() // Simplified for now
}

// Method to calculate discount amount
referralSchema.methods.calculateDiscount = function(orderAmount) {
  if (!this.isValid() || orderAmount < this.minOrderAmount) return 0
  
  let discount = 0
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount
    }
  } else {
    discount = this.discountValue
  }
  
  return Math.min(discount, orderAmount)
}

// Method to calculate commission
referralSchema.methods.calculateCommission = function(finalAmount) {
  if (this.commissionType === 'percentage') {
    return (finalAmount * this.commissionValue) / 100
  } else {
    return this.commissionValue
  }
}

// Method to use referral
referralSchema.methods.use = function(orderAmount, userId) {
  if (!this.isValid()) {
    throw new Error('Referral code is not valid')
  }
  
  const discount = this.calculateDiscount(orderAmount)
  const finalAmount = orderAmount - discount
  const commission = this.calculateCommission(finalAmount)
  
  this.usageCount += 1
  this.totalReferrals += 1
  this.successfulReferrals += 1
  this.totalCommissionEarned += commission
  this.totalDiscountGiven += discount
  this.lastUsedAt = new Date()
  
  return {
    discount,
    finalAmount,
    commission
  }
}

// Method to deactivate referral
referralSchema.methods.deactivate = function(reason, deactivatedBy) {
  this.isActive = false
  this.deactivatedAt = new Date()
  this.deactivationReason = reason
  this.deactivatedBy = deactivatedBy
}

// Static method to get active referrals
referralSchema.statics.getActiveReferrals = function(filter = {}) {
  return this.find({
    isActive: true,
    startDate: { $lte: new Date() },
    expirationDate: { $gte: new Date() },
    ...filter
  })
}

// Static method to get agent's referrals
referralSchema.statics.getAgentReferrals = function(agentId, includeInactive = false) {
  const filter = { agentId }
  if (!includeInactive) {
    filter.isActive = true
  }
  return this.find(filter).sort({ createdAt: -1 })
}

// Static method to validate referral code
referralSchema.statics.validateCode = function(code) {
  return this.findOne({ 
    code: code.toUpperCase(),
    isActive: true,
    startDate: { $lte: new Date() },
    expirationDate: { $gte: new Date() }
  })
}

const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema)

module.exports = Referral