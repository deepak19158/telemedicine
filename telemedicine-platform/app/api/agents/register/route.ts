import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// POST /api/agents/register - Agent registration
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const {
      email,
      password,
      confirmPassword,
      profile: {
        name,
        phone,
        address,
        bankDetails,
        panNumber,
        aadharNumber,
        referenceAgent,
        agreeToTerms
      }
    } = body

    // Validation
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    if (!agreeToTerms) {
      return NextResponse.json(
        { error: 'You must agree to the terms and conditions' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Generate unique agent code
    const agentCode = await generateUniqueAgentCode()

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'agent',
      profile: {
        name,
        phone,
        address,
        agentCode,
        bankDetails: {
          accountNumber: bankDetails?.accountNumber,
          ifscCode: bankDetails?.ifscCode,
          bankName: bankDetails?.bankName,
          accountHolderName: bankDetails?.accountHolderName
        },
        panNumber,
        aadharNumber,
        referenceAgent,
        registrationDate: new Date(),
        verificationStatus: 'pending',
        commissionRate: 15, // Default 15% commission
        status: 'pending_approval'
      },
      isActive: false, // Agents need admin approval
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await user.save()

    // Remove password from response
    const { password: _, ...userResponse } = user.toObject()

    return NextResponse.json({
      success: true,
      message: 'Agent registration submitted successfully. Please wait for admin approval.',
      user: userResponse,
      agentCode
    }, { status: 201 })

  } catch (error) {
    console.error('Error registering agent:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate unique agent code
async function generateUniqueAgentCode(): Promise<string> {
  let isUnique = false
  let agentCode = ''

  while (!isUnique) {
    // Generate code in format: AGT-YYMMDD-XXXX
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    
    agentCode = `AGT-${year}${month}${day}-${random}`

    // Check if code already exists
    const existingAgent = await User.findOne({ 
      'profile.agentCode': agentCode 
    })

    if (!existingAgent) {
      isUnique = true
    }
  }

  return agentCode
}