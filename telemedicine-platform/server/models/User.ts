import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  role: 'patient' | 'doctor' | 'agent' | 'admin'
  profile: {
    name: string
    phone?: string
    address?: {
      street?: string
      city?: string
      state?: string
      zipCode?: string
      country?: string
    }
    // Role-specific fields
    specialization?: string // For doctors
    licenseNumber?: string // For doctors
    agentCode?: string // For agents
    referralCode?: string // For agents
    assignedDoctor?: mongoose.Types.ObjectId // For patients
  }
  isActive: boolean
  isVerified: boolean
  // Doctor approval tracking
  registrationStatus?: 'pending_approval' | 'approved' | 'rejected'
  approvedAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  rejectedAt?: Date
  rejectedBy?: mongoose.Types.ObjectId
  approvalReason?: string
  rejectionReason?: string
  // Password reset fields
  passwordResetToken?: string
  passwordResetExpires?: Date
  // Email verification fields
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>({
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
      required: function(this: IUser) {
        return this.role === 'doctor'
      }
    },
    licenseNumber: {
      type: String,
      required: function(this: IUser) {
        return this.role === 'doctor'
      }
    },
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
      type: Schema.Types.ObjectId,
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
  // Doctor approval tracking
  registrationStatus: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: function(this: IUser) {
      return this.role === 'doctor' ? 'pending_approval' : 'approved'
    }
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalReason: {
    type: String
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
  
  const bcrypt = require('bcryptjs')
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema)

export default User