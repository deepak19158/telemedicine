import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })
    
    if (!user) {
      // Return success even if user doesn't exist for security
      return NextResponse.json(
        { message: 'Verification email sent if account exists' },
        { status: 200 }
      )
    }

    // Check if user is already verified
    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex')
    
    // Set verification token and expiry (24 hours from now)
    user.emailVerificationToken = verificationTokenHash
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    await user.save()

    // TODO: Send email with verification link
    // For now, we'll just return success
    // In production, you would send an email with the verification link
    
    console.log(`Email verification token for ${email}: ${verificationToken}`)
    console.log(`Verification link would be: ${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}`)
    
    return NextResponse.json(
      { message: 'Verification email sent if account exists' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}