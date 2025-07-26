import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]/route'
import connectDB from '../../../../../../lib/db'
import User from '../../../../../../server/models/User'

// PUT /api/admin/doctors/[id]/approve - Doctor approval system
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
    const { action, reason, assignPatients } = body // action: 'approve' | 'reject'
    const doctorId = params.id

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Find the doctor
    const doctor = await User.findById(doctorId)
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    if (doctor.role !== 'doctor') {
      return NextResponse.json(
        { error: 'User is not a doctor' },
        { status: 400 }
      )
    }

    // Check if already processed
    if (action === 'approve' && doctor.isActive) {
      return NextResponse.json(
        { error: 'Doctor is already approved' },
        { status: 400 }
      )
    }

    if (action === 'reject' && doctor.registrationStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Doctor registration is already rejected' },
        { status: 400 }
      )
    }

    let updateData: any = {
      registrationStatus: action === 'approve' ? 'approved' : 'rejected',
      [`${action}edAt`]: new Date(),
      [`${action}edBy`]: currentUser._id,
      [`${action}alReason`]: reason || `${action === 'approve' ? 'Approved' : 'Rejected'} by admin`
    }

    if (action === 'approve') {
      updateData.isActive = true
      // If admin chooses to assign patients immediately
      if (assignPatients) {
        updateData.acceptingNewPatients = true
      }
    } else {
      updateData.isActive = false
    }

    // Update doctor status
    const updatedDoctor = await User.findByIdAndUpdate(
      doctorId,
      { $set: updateData },
      { 
        new: true,
        select: '-password -passwordResetToken -emailVerificationToken'
      }
    )

    // If approving, we might want to auto-assign some patients or send welcome email
    if (action === 'approve') {
      // Log approval for audit
      console.log(`Doctor approved: ${doctor.email} by admin ${currentUser.email}`)
      
      // TODO: Send approval email to doctor
      // TODO: Send notification to admin team
      // TODO: If assignPatients is true, implement patient assignment logic
    } else {
      // Log rejection for audit
      console.log(`Doctor rejected: ${doctor.email} by admin ${currentUser.email} - Reason: ${reason}`)
      
      // TODO: Send rejection email to doctor with reason
    }

    return NextResponse.json({
      success: true,
      message: `Doctor ${action}d successfully`,
      doctor: updatedDoctor,
      action
    })
  } catch (error) {
    console.error('Doctor approval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}