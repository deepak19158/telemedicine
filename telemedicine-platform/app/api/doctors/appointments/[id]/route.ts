import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import Appointment from '../../../../../server/models/Appointment'

// PUT /api/doctors/appointments/[id] - Update appointment (accept/reject/reschedule/complete)
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

    if (session.user.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Access denied. Doctor role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const appointmentId = params.id
    const body = await request.json()
    const { action, ...updateData } = body

    // Find the appointment and verify it belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: session.user.id
    }).populate('patientId', 'profile.name email profile.phone')

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    let updates: any = {}
    let message = 'Appointment updated successfully'

    // Handle different actions
    switch (action) {
      case 'accept':
      case 'confirm':
        if (appointment.status !== 'scheduled') {
          return NextResponse.json(
            { error: 'Only scheduled appointments can be confirmed' },
            { status: 400 }
          )
        }
        updates.status = 'confirmed'
        updates.confirmedAt = new Date()
        updates.confirmedBy = session.user.id
        message = 'Appointment confirmed successfully'
        break

      case 'reject':
      case 'decline':
        if (['completed', 'cancelled'].includes(appointment.status)) {
          return NextResponse.json(
            { error: 'Cannot reject completed or cancelled appointments' },
            { status: 400 }
          )
        }
        updates.status = 'rejected'
        updates.rejectedAt = new Date()
        updates.rejectedBy = session.user.id
        updates.rejectionReason = updateData.rejectionReason || 'Doctor unavailable'
        message = 'Appointment rejected'
        break

      case 'reschedule':
        if (['completed', 'cancelled', 'rejected'].includes(appointment.status)) {
          return NextResponse.json(
            { error: 'Cannot reschedule completed, cancelled, or rejected appointments' },
            { status: 400 }
          )
        }
        
        if (!updateData.newAppointmentDate) {
          return NextResponse.json(
            { error: 'New appointment date is required for rescheduling' },
            { status: 400 }
          )
        }

        const newDateTime = new Date(updateData.newAppointmentDate)
        if (newDateTime <= new Date()) {
          return NextResponse.json(
            { error: 'New appointment date must be in the future' },
            { status: 400 }
          )
        }

        // Check for conflicts
        const conflictingAppointment = await Appointment.findOne({
          _id: { $ne: appointmentId },
          doctorId: session.user.id,
          appointmentDate: newDateTime,
          status: { $in: ['scheduled', 'confirmed'] }
        })

        if (conflictingAppointment) {
          return NextResponse.json(
            { error: 'The new time slot is already booked' },
            { status: 409 }
          )
        }

        updates.appointmentDate = newDateTime
        updates.status = 'scheduled' // Reset to scheduled for patient confirmation
        updates.rescheduledAt = new Date()
        updates.rescheduledBy = session.user.id
        updates.rescheduleReason = updateData.rescheduleReason
        message = 'Appointment rescheduled successfully'
        break

      case 'complete':
        if (appointment.status !== 'confirmed') {
          return NextResponse.json(
            { error: 'Only confirmed appointments can be marked as completed' },
            { status: 400 }
          )
        }
        
        updates.status = 'completed'
        updates.completedAt = new Date()
        updates.consultationNotes = updateData.consultationNotes
        updates.prescription = updateData.prescription
        updates.followUpDate = updateData.followUpDate
        updates.diagnosis = updateData.diagnosis
        updates.treatmentPlan = updateData.treatmentPlan
        message = 'Appointment completed successfully'
        break

      case 'add_notes':
        updates.consultationNotes = updateData.consultationNotes
        updates.prescription = updateData.prescription
        updates.diagnosis = updateData.diagnosis
        updates.treatmentPlan = updateData.treatmentPlan
        updates.followUpDate = updateData.followUpDate
        message = 'Consultation notes added successfully'
        break

      default:
        // General update - allow specific field updates
        const allowedUpdates = [
          'consultationNotes',
          'prescription',
          'followUpDate',
          'diagnosis',
          'treatmentPlan',
          'doctorNotes'
        ]

        for (const field of allowedUpdates) {
          if (updateData[field] !== undefined) {
            updates[field] = updateData[field]
          }
        }
        break
    }

    // Add updated timestamp
    updates.updatedAt = new Date()

    // Update the appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updates,
      { new: true }
    ).populate([
      { path: 'patientId', select: 'profile.name email profile.phone profile.address' },
      { path: 'doctorId', select: 'profile.name profile.specialization' }
    ])

    return NextResponse.json({
      success: true,
      message,
      appointment: updatedAppointment,
      action: action || 'update'
    })

  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/doctors/appointments/[id] - Get specific appointment
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

    await connectDB()
    
    const appointmentId = params.id
    let filter: any = { _id: appointmentId }

    // Add role-based filtering
    if (session.user.role === 'doctor') {
      filter.doctorId = session.user.id
    } else if (session.user.role === 'patient') {
      filter.patientId = session.user.id
    } else if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const appointment = await Appointment.findOne(filter)
      .populate('patientId', 'profile.name name email profile.phone profile.address')
      .populate('doctorId', 'profile.name name profile.specialization profile.licenseNumber')

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ appointment })

  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}