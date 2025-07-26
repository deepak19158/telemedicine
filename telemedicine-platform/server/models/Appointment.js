const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 30, // minutes
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  appointmentType: {
    type: String,
    enum: ['consultation', 'follow_up', 'emergency'],
    default: 'consultation'
  },
  consultationFee: {
    type: Number,
    required: true
  },
  // Referral system integration
  referralCode: {
    type: String,
    trim: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  discount: {
    type: Number,
    default: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  agentCommission: {
    type: Number,
    default: 0
  },
  commissionPercentage: {
    type: Number,
    default: 0
  },
  // Payment information
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'payu', 'cash_via_agent', 'pending'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  finalAmount: {
    type: Number,
    required: true
  },
  // Medical information
  symptoms: [{
    type: String,
    trim: true
  }],
  chiefComplaint: {
    type: String,
    trim: true
  },
  medicalHistory: {
    type: String,
    trim: true
  },
  allergies: [{
    type: String,
    trim: true
  }],
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String
  }],
  // Consultation details
  consultationNotes: {
    type: String,
    trim: true
  },
  diagnosis: {
    type: String,
    trim: true
  },
  prescription: [{
    medicine: {
      type: String,
      required: true
    },
    dosage: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    instructions: {
      type: String
    }
  }],
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  // Rating and feedback
  patientRating: {
    type: Number,
    min: 1,
    max: 5
  },
  patientFeedback: {
    type: String,
    trim: true
  },
  doctorRating: {
    type: Number,
    min: 1,
    max: 5
  },
  doctorNotes: {
    type: String,
    trim: true
  },
  // Scheduling
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancelledAt: {
    type: Date
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
appointmentSchema.index({ patientId: 1, appointmentDate: 1 })
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 })
appointmentSchema.index({ appointmentDate: 1, status: 1 })
appointmentSchema.index({ referralCode: 1 })
appointmentSchema.index({ agentId: 1 })
appointmentSchema.index({ paymentStatus: 1 })
appointmentSchema.index({ status: 1 })

// Virtual for appointment datetime
appointmentSchema.virtual('appointmentDateTime').get(function() {
  const date = new Date(this.appointmentDate)
  const [hours, minutes] = this.appointmentTime.split(':')
  date.setHours(hours, minutes, 0, 0)
  return date
})

// Virtual for total amount calculation
appointmentSchema.virtual('totalAmount').get(function() {
  return this.consultationFee - this.discount
})

// Pre-save middleware to calculate final amount
appointmentSchema.pre('save', function(next) {
  if (this.isModified('consultationFee') || this.isModified('discount')) {
    this.finalAmount = this.consultationFee - this.discount
  }
  next()
})

// Method to check if appointment is upcoming
appointmentSchema.methods.isUpcoming = function() {
  return this.appointmentDateTime > new Date() && this.status === 'scheduled'
}

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  const now = new Date()
  const appointmentTime = this.appointmentDateTime
  const timeDiff = appointmentTime.getTime() - now.getTime()
  const hoursDiff = timeDiff / (1000 * 3600)
  
  return hoursDiff > 2 && ['scheduled', 'confirmed'].includes(this.status)
}

// Method to calculate commission
appointmentSchema.methods.calculateCommission = function() {
  if (this.agentId && this.commissionPercentage > 0) {
    this.agentCommission = (this.finalAmount * this.commissionPercentage) / 100
  }
}

// Static method to get appointments by date range
appointmentSchema.statics.getByDateRange = function(startDate, endDate, filter = {}) {
  return this.find({
    appointmentDate: {
      $gte: startDate,
      $lte: endDate
    },
    ...filter
  })
}

// Static method to get doctor's availability
appointmentSchema.statics.getDoctorAvailability = function(doctorId, date) {
  return this.find({
    doctorId,
    appointmentDate: date,
    status: { $in: ['scheduled', 'confirmed'] }
  }).select('appointmentTime duration')
}

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema)

module.exports = Appointment