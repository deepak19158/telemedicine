import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import Appointment from '../../../../../server/models/Appointment'
import Referral from '../../../../../server/models/Referral'

// GET /api/patients/appointments/[id] - Get specific appointment details
export async function GET(
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

    if (session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Access denied. Patient role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const appointment = await Appointment.findOne({
      _id: params.id,
      patientId: session.user.id
    }).populate([
      { path: 'doctorId', select: 'profile.name profile.specialization profile.consultationFee profile.phone' },
      { path: 'patientId', select: 'profile.name profile.phone' }
    ])

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      appointment
    })

  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/patients/appointments/[id] - Update appointment (reschedule)
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

    if (session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Access denied. Patient role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const { appointmentDate, reasonForVisit, patientNotes } = body

    // Find the appointment
    const appointment = await Appointment.findOne({
      _id: params.id,
      patientId: session.user.id
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check if appointment can be rescheduled
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot reschedule completed or cancelled appointments' },
        { status: 400 }
      )
    }

    // If rescheduling, validate new date
    if (appointmentDate) {
      const newDateTime = new Date(appointmentDate)
      
      if (newDateTime <= new Date()) {
        return NextResponse.json(
          { error: 'New appointment date must be in the future' },
          { status: 400 }
        )
      }

      // Check for conflicts with the new time slot
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: params.id },
        doctorId: appointment.doctorId,
        appointmentDate: newDateTime,
        status: { $in: ['scheduled', 'confirmed'] }
      })

      if (conflictingAppointment) {
        return NextResponse.json(
          { error: 'The new time slot is already booked' },
          { status: 409 }
        )
      }

      appointment.appointmentDate = newDateTime
    }

    // Update other fields if provided
    if (reasonForVisit !== undefined) appointment.reasonForVisit = reasonForVisit
    if (patientNotes !== undefined) appointment.patientNotes = patientNotes
    
    // Mark as updated
    appointment.updatedAt = new Date()
    
    // If rescheduling, reset status to scheduled
    if (appointmentDate && appointment.status === 'confirmed') {
      appointment.status = 'scheduled'
    }

    await appointment.save()
    
    // Populate the response
    await appointment.populate([
      { path: 'doctorId', select: 'profile.name profile.specialization profile.consultationFee' },
      { path: 'patientId', select: 'profile.name profile.phone' }
    ])

    return NextResponse.json({
      success: true,
      message: appointmentDate ? 'Appointment rescheduled successfully' : 'Appointment updated successfully',
      appointment
    })

  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/appointments/[id] - Cancel appointment
export async function DELETE(
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

    if (session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Access denied. Patient role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const { cancellationReason } = body

    // Find the appointment
    const appointment = await Appointment.findOne({
      _id: params.id,
      patientId: session.user.id
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Check if appointment can be cancelled
    if (appointment.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed appointments' },
        { status: 400 }
      )
    }

    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' },
        { status: 400 }
      )
    }

    // Check cancellation timing (e.g., at least 2 hours before appointment)
    const appointmentTime = new Date(appointment.appointmentDate)
    const now = new Date()
    const timeDifference = appointmentTime.getTime() - now.getTime()
    const hoursUntilAppointment = timeDifference / (1000 * 60 * 60)

    if (hoursUntilAppointment < 2) {
      return NextResponse.json(
        { error: 'Appointments cannot be cancelled less than 2 hours before the scheduled time' },
        { status: 400 }
      )
    }

    // Update appointment status
    appointment.status = 'cancelled'
    appointment.cancellationReason = cancellationReason || 'Patient cancelled'
    appointment.cancelledAt = new Date()
    appointment.cancelledBy = session.user.id
    appointment.updatedAt = new Date()

    await appointment.save()

    // If referral code was used, reverse the referral statistics
    if (appointment.referralCode && appointment.referralDetails) {
      await Referral.findByIdAndUpdate(appointment.referralDetails.id, {
        $inc: { 
          usageCount: -1,
          totalReferrals: -1,
          totalDiscountGiven: -appointment.discount,
          totalCommissionEarned: -appointment.agentCommission
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: appointment._id,
        status: appointment.status,
        cancellationReason: appointment.cancellationReason,
        cancelledAt: appointment.cancelledAt
      }
    })

  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}