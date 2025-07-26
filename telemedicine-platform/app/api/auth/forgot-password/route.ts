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
        { message: 'Password reset link sent to email if account exists' },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    
    // Set reset token and expiry (1 hour from now)
    user.passwordResetToken = resetTokenHash
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    
    await user.save()

    // TODO: Send email with reset link
    // For now, we'll just return success
    // In production, you would send an email with the reset link
    
    console.log(`Password reset token for ${email}: ${resetToken}`)
    console.log(`Reset link would be: ${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`)
    
    return NextResponse.json(
      { message: 'Password reset link sent to email if account exists' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}