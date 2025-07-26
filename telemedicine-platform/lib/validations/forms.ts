import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Please enter a valid email address')
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits')

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters long')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')

// User Registration Schema
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  phone: phoneSchema,
  role: z.enum(['patient', 'doctor', 'agent'], {
    required_error: 'Please select a role'
  }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Login Schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Password Reset Schema
export const passwordResetSchema = z.object({
  email: emailSchema
})

// New Password Schema
export const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Profile Update Schema
export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
    country: z.string().min(1, 'Country is required')
  }).optional()
})

// Doctor Registration Schema
export const doctorRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  phone: phoneSchema,
  specialization: z.string().min(1, 'Specialization is required'),
  experience: z.number().min(0, 'Experience cannot be negative'),
  qualifications: z.string().min(1, 'Qualifications are required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  consultationFee: z.number().min(0, 'Consultation fee cannot be negative'),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Agent Registration Schema
export const agentRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  phone: phoneSchema,
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
    country: z.string().min(1, 'Country is required')
  }),
  bankDetails: z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    routingNumber: z.string().min(1, 'Routing number is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    accountHolderName: z.string().min(1, 'Account holder name is required')
  }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Appointment Booking Schema
export const appointmentBookingSchema = z.object({
  doctorId: z.string().min(1, 'Doctor selection is required'),
  appointmentDate: z.date({
    required_error: 'Appointment date is required'
  }),
  timeSlot: z.string().min(1, 'Time slot is required'),
  symptoms: z.string().min(10, 'Please describe your symptoms (minimum 10 characters)'),
  referralCode: z.string().optional(),
  paymentMethod: z.enum(['razorpay', 'payu', 'cash_via_agent'], {
    required_error: 'Payment method is required'
  })
})

// Contact Form Schema
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters long')
})

// Feedback Schema
export const feedbackSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5, 'Rating cannot exceed 5'),
  feedback: z.string().min(10, 'Feedback must be at least 10 characters long')
})

// Search Schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  category: z.enum(['doctors', 'appointments', 'patients', 'agents']).optional(),
  filters: z.object({
    dateRange: z.object({
      start: z.date().optional(),
      end: z.date().optional()
    }).optional(),
    status: z.string().optional(),
    specialization: z.string().optional()
  }).optional()
})

// Export types
export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type Login = z.infer<typeof loginSchema>
export type PasswordReset = z.infer<typeof passwordResetSchema>
export type NewPassword = z.infer<typeof newPasswordSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
export type DoctorRegistration = z.infer<typeof doctorRegistrationSchema>
export type AgentRegistration = z.infer<typeof agentRegistrationSchema>
export type AppointmentBooking = z.infer<typeof appointmentBookingSchema>
export type ContactForm = z.infer<typeof contactFormSchema>
export type Feedback = z.infer<typeof feedbackSchema>
export type Search = z.infer<typeof searchSchema>