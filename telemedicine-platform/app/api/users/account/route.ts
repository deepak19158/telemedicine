import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// DELETE /api/users/account - Account deactivation
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { password, reason } = body

    // Find the user
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      )
    }

    // Check if user has pending appointments (for doctors/patients)
    if (user.role === 'doctor' || user.role === 'patient') {
      const Appointment = require('../../../../server/models/Appointment')
      const pendingAppointments = await Appointment.countDocuments({
        $or: [
          { doctorId: user._id, status: { $in: ['scheduled', 'confirmed'] } },
          { patientId: user._id, status: { $in: ['scheduled', 'confirmed'] } }
        ]
      })

      if (pendingAppointments > 0) {
        return NextResponse.json(
          { 
            error: 'Cannot deactivate account with pending appointments. Please complete or cancel all appointments first.',
            pendingAppointments
          },
          { status: 400 }
        )
      }
    }

    // Deactivate user account instead of deleting
    const deactivatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { 
        $set: { 
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: reason || 'User requested account deactivation'
        }
      },
      { new: true, select: '-password -passwordResetToken -emailVerificationToken' }
    )

    // Log account deactivation for audit purposes
    console.log(`Account deactivated for user ${user.email} (${user.role}) - Reason: ${reason}`)

    return NextResponse.json({
      success: true,
      message: 'Account deactivated successfully. You can reactivate your account by contacting support.',
      user: deactivatedUser
    })
  } catch (error) {
    console.error('Account deactivation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/account - Reactivate account (for support use)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Only admin can reactivate accounts
    const currentUser = await User.findById(session.user.id)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, reason } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Reactivate user account
    const reactivatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          isActive: true,
          reactivatedAt: new Date(),
          reactivationReason: reason || 'Admin reactivated account'
        },
        $unset: {
          deactivatedAt: 1,
          deactivationReason: 1
        }
      },
      { new: true, select: '-password -passwordResetToken -emailVerificationToken' }
    )

    if (!reactivatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Log account reactivation for audit purposes
    console.log(`Account reactivated for user ${reactivatedUser.email} by admin ${currentUser.email} - Reason: ${reason}`)

    return NextResponse.json({
      success: true,
      message: 'Account reactivated successfully',
      user: reactivatedUser
    })
  } catch (error) {
    console.error('Account reactivation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}