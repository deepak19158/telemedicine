import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Hash the token to compare with stored hash
    const emailVerificationHash = crypto.createHash('sha256').update(token).digest('hex')
    
    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: emailVerificationHash,
      emailVerificationExpires: { $gt: new Date() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Update user as verified and clear verification token
    user.isVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpires = undefined
    
    await user.save()

    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Hash the token to compare with stored hash
    const emailVerificationHash = crypto.createHash('sha256').update(token).digest('hex')
    
    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: emailVerificationHash,
      emailVerificationExpires: { $gt: new Date() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Update user as verified and clear verification token
    user.isVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpires = undefined
    
    await user.save()

    // Return HTML response for email link verification
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #10b981; }
            .card { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1 class="success">✓ Email Verified Successfully</h1>
            <p>Your email has been verified. You can now login to your account.</p>
            <a href="/login" style="color: #2563eb; text-decoration: none;">Go to Login</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #ef4444; }
            .card { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1 class="error">✗ Verification Failed</h1>
            <p>Unable to verify your email. Please try again or contact support.</p>
            <a href="/login" style="color: #2563eb; text-decoration: none;">Go to Login</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}