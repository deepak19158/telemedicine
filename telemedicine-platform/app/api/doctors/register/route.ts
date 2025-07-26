import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// POST /api/doctors/register - Enhanced doctor registration
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { 
      email, 
      password, 
      name, 
      phone, 
      specialization, 
      licenseNumber,
      medicalDegree,
      graduationYear,
      hospitalAffiliation,
      experience,
      consultationFee,
      about,
      address
    } = body

    // Validate required fields
    if (!email || !password || !name || !specialization || !licenseNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, specialization, licenseNumber' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Check if license number is already registered
    const existingLicense = await User.findOne({ 
      'profile.licenseNumber': licenseNumber,
      role: 'doctor'
    })
    if (existingLicense) {
      return NextResponse.json(
        { error: 'License number already registered' },
        { status: 409 }
      )
    }

    // Validate specialization (you can extend this list)
    const validSpecializations = [
      'General Medicine',
      'Cardiology',
      'Dermatology',
      'Pediatrics',
      'Orthopedics',
      'Neurology',
      'Psychiatry',
      'Oncology',
      'Gynecology',
      'Ophthalmology',
      'ENT',
      'Emergency Medicine',
      'Internal Medicine',
      'Family Medicine',
      'Radiology',
      'Anesthesiology',
      'Pathology',
      'Surgery',
      'Urology',
      'Endocrinology'
    ]

    if (!validSpecializations.includes(specialization)) {
      return NextResponse.json(
        { error: 'Invalid specialization. Please select from the available options.' },
        { status: 400 }
      )
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex')

    // Create doctor user object
    const doctorData = {
      email: email.toLowerCase(),
      password,
      role: 'doctor',
      profile: {
        name: name.trim(),
        phone: phone?.trim(),
        specialization,
        licenseNumber: licenseNumber.trim(),
        medicalDegree: medicalDegree?.trim(),
        graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
        hospitalAffiliation: hospitalAffiliation?.trim(),
        experience: experience ? parseInt(experience) : undefined,
        consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
        about: about?.trim(),
        address: address ? {
          street: address.street?.trim(),
          city: address.city?.trim(),
          state: address.state?.trim(),
          zipCode: address.zipCode?.trim(),
          country: address.country?.trim()
        } : undefined
      },
      isActive: false, // Doctors need admin approval
      isVerified: false,
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      registrationStatus: 'pending_approval',
      submittedAt: new Date()
    }

    // Create new doctor
    const newDoctor = new User(doctorData)
    await newDoctor.save()

    // Log registration for admin notification
    console.log(`New doctor registration: ${email} - License: ${licenseNumber}`)

    // Remove sensitive data from response
    const { password: _, emailVerificationToken: __, ...doctorResponse } = newDoctor.toObject()

    return NextResponse.json(
      { 
        success: true,
        message: 'Doctor registration submitted successfully. Your account will be reviewed by our admin team within 24-48 hours. Please check your email to verify your account.',
        doctor: doctorResponse,
        verificationToken // For testing purposes - remove in production
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Doctor registration error:', error)
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}