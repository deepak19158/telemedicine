import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]/route'
import connectDB from '../../../../../../lib/db'
import User from '../../../../../../server/models/User'

// PUT /api/admin/users/[id]/status - User activation/deactivation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Check if user is admin
    const currentUser = await User.findById(session.user.id)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isActive, reason } = body
    const userId = params.id

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean value' },
        { status: 400 }
      )
    }

    // Prevent admin from deactivating themselves
    if (userId === session.user.id && !isActive) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Find the target user
    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check for pending appointments before deactivation
    if (!isActive && (targetUser.role === 'doctor' || targetUser.role === 'patient')) {
      const Appointment = require('../../../../../../server/models/Appointment')
      const pendingAppointments = await Appointment.countDocuments({
        $or: [
          { doctorId: targetUser._id, status: { $in: ['scheduled', 'confirmed'] } },
          { patientId: targetUser._id, status: { $in: ['scheduled', 'confirmed'] } }
        ]
      })

      if (pendingAppointments > 0) {
        return NextResponse.json(
          { 
            error: 'Cannot deactivate user with pending appointments. Please handle appointments first.',
            pendingAppointments
          },
          { status: 400 }
        )
      }
    }

    // Update user status
    const updateData: any = { 
      isActive,
      [`${isActive ? 'reactivated' : 'deactivated'}At`]: new Date(),
      [`${isActive ? 'reactivation' : 'deactivation'}Reason`]: reason || `Admin ${isActive ? 'activated' : 'deactivated'} account`,
      [`${isActive ? 'reactivated' : 'deactivated'}By`]: currentUser._id
    }

    // Remove opposite status fields
    const unsetFields: any = {}
    if (isActive) {
      unsetFields.deactivatedAt = 1
      unsetFields.deactivationReason = 1
      unsetFields.deactivatedBy = 1
    } else {
      unsetFields.reactivatedAt = 1
      unsetFields.reactivationReason = 1
      unsetFields.reactivatedBy = 1
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: updateData,
        $unset: unsetFields
      },
      { 
        new: true,
        select: '-password -passwordResetToken -emailVerificationToken'
      }
    )

    // Log the action for audit purposes
    console.log(`User ${targetUser.email} (${targetUser.role}) ${isActive ? 'activated' : 'deactivated'} by admin ${currentUser.email} - Reason: ${reason}`)

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    })
  } catch (error) {
    console.error('Admin user status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}