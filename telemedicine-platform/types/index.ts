import { Document } from 'mongoose'

// User Types
export type UserRole = 'patient' | 'doctor' | 'agent' | 'admin'

export interface IUser extends Document {
  _id: string
  email: string
  password: string
  role: UserRole
  profile: IUserProfile
  isActive: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IUserProfile {
  name: string
  phone: string
  address: IAddress
  avatar?: string
  // Role-specific fields will be added based on user type
}

export interface IAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

// Patient Types
export interface IPatient extends IUser {
  profile: IPatientProfile
  assignedDoctorId?: string
  medicalHistory: IMedicalHistory[]
  emergencyContact: IEmergencyContact
}

export interface IPatientProfile extends IUserProfile {
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other'
  bloodGroup?: string
  allergies?: string[]
  currentMedications?: string[]
}

export interface IMedicalHistory {
  condition: string
  diagnosedDate: Date
  status: 'active' | 'resolved' | 'chronic'
  notes?: string
}

export interface IEmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

// Doctor Types
export interface IDoctor extends IUser {
  profile: IDoctorProfile
  specializations: string[]
  experience: number
  consultationFee: number
  availability: IAvailability[]
  isApproved: boolean
  approvedBy?: string
  rating: number
  totalConsultations: number
}

export interface IDoctorProfile extends IUserProfile {
  medicalLicense: string
  qualification: string[]
  hospitalAffiliation?: string
  bio?: string
}

export interface IAvailability {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  startTime: string // Format: "HH:MM"
  endTime: string // Format: "HH:MM"
  isAvailable: boolean
}

// Agent Types
export interface IAgent extends IUser {
  profile: IAgentProfile
  referralCodes: string[]
  totalCommissions: number
  totalReferrals: number
  successfulReferrals: number
  commissionRate: number
  bankDetails?: IBankDetails
}

export interface IAgentProfile extends IUserProfile {
  agentId: string
  joiningDate: Date
  territory?: string
}

export interface IBankDetails {
  accountHolderName: string
  accountNumber: string
  bankName: string
  ifscCode: string
  upiId?: string
}

// Appointment Types
export interface IAppointment extends Document {
  _id: string
  patientId: string
  doctorId: string
  appointmentDate: Date
  status: AppointmentStatus
  consultationFee: number
  discount: number
  finalAmount: number
  referralCode?: string
  agentId?: string
  agentCommission: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentId?: string
  consultationNotes?: string
  prescription?: string
  symptoms: string
  duration: number // in minutes
  createdAt: Date
  updatedAt: Date
}

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'in-progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no-show'

export type PaymentMethod = 'razorpay' | 'payu' | 'cash_via_agent'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

// Referral Types
export interface IReferral extends Document {
  _id: string
  agentId: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  usageCount: number
  maxUsage: number
  expirationDate: Date
  isActive: boolean
  assignedBy: string // Admin who assigned
  createdAt: Date
  updatedAt: Date
}

// Payment Types
export interface IPayment extends Document {
  _id: string
  appointmentId: string
  patientId: string
  doctorId: string
  agentId?: string
  amount: number
  discount: number
  finalAmount: number
  agentCommission: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentGatewayId?: string
  paymentGatewayResponse?: any
  transactionId?: string
  createdAt: Date
  updatedAt: Date
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  role: UserRole
  name: string
  phone: string
}

export interface AppointmentBookingData {
  doctorId: string
  appointmentDate: Date
  symptoms: string
  referralCode?: string
}

// Analytics Types
export interface AnalyticsData {
  totalUsers: number
  totalAppointments: number
  totalRevenue: number
  totalCommissions: number
  userGrowth: ChartData[]
  revenueGrowth: ChartData[]
  appointmentStats: AppointmentStats[]
}

export interface ChartData {
  label: string
  value: number
  date: Date
}

export interface AppointmentStats {
  status: AppointmentStatus
  count: number
  percentage: number
}

// Dashboard Types
export interface DashboardStats {
  [key: string]: number | string
}

export interface DoctorDashboardData {
  todayAppointments: IAppointment[]
  upcomingAppointments: IAppointment[]
  monthlyEarnings: number
  totalPatients: number
  pendingAppointments: number
}

export interface PatientDashboardData {
  upcomingAppointments: IAppointment[]
  recentAppointments: IAppointment[]
  assignedDoctor?: IDoctor
  healthSummary: any
}

export interface AgentDashboardData {
  monthlyCommissions: number
  totalReferrals: number
  successfulReferrals: number
  conversionRate: number
  recentReferrals: any[]
  activeCodes: IReferral[]
}

// Error Types
export interface ValidationError {
  field: string
  message: string
}

export interface AppError extends Error {
  statusCode: number
  isOperational: boolean
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>