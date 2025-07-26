const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'agent', 'admin'],
    required: true
  },
  profile: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    avatar: {
      type: String, // URL to profile image
      default: null
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    // Doctor-specific fields
    specialization: {
      type: String,
      required: function() {
        return this.role === 'doctor'
      }
    },
    licenseNumber: {
      type: String,
      required: function() {
        return this.role === 'doctor'
      }
    },
    medicalDegree: {
      type: String
    },
    graduationYear: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear()
    },
    hospitalAffiliation: {
      type: String
    },
    experience: {
      type: Number,
      min: 0,
      max: 50
    },
    consultationFee: {
      type: Number,
      min: 0,
      max: 10000
    },
    about: {
      type: String,
      maxlength: 1000
    },
    acceptingNewPatients: {
      type: Boolean,
      default: true
    },
    workingHours: {
      monday: { enabled: Boolean, startTime: String, endTime: String },
      tuesday: { enabled: Boolean, startTime: String, endTime: String },
      wednesday: { enabled: Boolean, startTime: String, endTime: String },
      thursday: { enabled: Boolean, startTime: String, endTime: String },
      friday: { enabled: Boolean, startTime: String, endTime: String },
      saturday: { enabled: Boolean, startTime: String, endTime: String },
      sunday: { enabled: Boolean, startTime: String, endTime: String }
    },
    timeSlots: {
      duration: { type: Number, enum: [15, 30, 45, 60], default: 30 },
      bufferTime: { type: Number, min: 0, max: 30, default: 5 }
    },
    breakTimes: mongoose.Schema.Types.Mixed,
    blockedDates: [{
      date: Date,
      reason: String,
      allDay: { type: Boolean, default: true },
      startTime: String,
      endTime: String
    }],
    // Agent-specific fields
    agentCode: {
      type: String,
      unique: true,
      sparse: true
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true
    },
    // Patient-specific fields
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Password reset fields
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  // Email verification fields
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  // Account management fields
  deactivatedAt: {
    type: Date
  },
  deactivationReason: {
    type: String
  },
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reactivatedAt: {
    type: Date
  },
  reactivationReason: {
    type: String
  },
  reactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Doctor approval tracking
  registrationStatus: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: function() {
      return this.role === 'doctor' ? 'pending_approval' : 'approved'
    }
  },
  submittedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalReason: {
    type: String
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
})

// Index for efficient queries
userSchema.index({ email: 1 })
userSchema.index({ role: 1 })
userSchema.index({ 'profile.agentCode': 1 })
userSchema.index({ 'profile.referralCode': 1 })

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.models.User || mongoose.model('User', userSchema)

module.exports = User