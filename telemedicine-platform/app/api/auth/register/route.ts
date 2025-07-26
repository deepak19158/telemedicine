import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { email, password, name, role, phone, specialization, licenseNumber } = body

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['patient', 'doctor', 'agent', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Validate doctor-specific fields
    if (role === 'doctor') {
      if (!specialization || !licenseNumber) {
        return NextResponse.json(
          { error: 'Specialization and license number are required for doctors' },
          { status: 400 }
        )
      }
    }

    // Create user object
    const userData: any = {
      email,
      password,
      role,
      profile: {
        name,
        phone
      }
    }

    // Add role-specific fields
    if (role === 'doctor') {
      userData.profile.specialization = specialization
      userData.profile.licenseNumber = licenseNumber
      userData.isActive = false // Doctors need approval
    }

    // Generate agent code for agents
    if (role === 'agent') {
      userData.profile.agentCode = `AG${Date.now().toString().slice(-6)}`
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex')
    
    userData.emailVerificationToken = verificationTokenHash
    userData.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    userData.isVerified = false

    // Create new user
    const newUser = new User(userData)
    await newUser.save()

    // TODO: Send email with verification link
    // For now, we'll just log it
    console.log(`Email verification token for ${email}: ${verificationToken}`)
    console.log(`Verification link would be: ${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}`)

    // Remove password from response
    const { password: _, ...userResponse } = newUser.toObject()

    return NextResponse.json(
      { 
        message: 'User created successfully. Please check your email to verify your account.',
        user: userResponse,
        requiresVerification: true
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}