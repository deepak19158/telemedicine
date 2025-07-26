import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../lib/auth'
import connectDB from '../../../../../../lib/db'
import Appointment from '../../../../../../server/models/Appointment'

// POST /api/doctors/appointments/[id]/notes - Add consultation notes and prescription
export async function POST(
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
    
    const {
      consultationNotes,
      prescription,
      diagnosis,
      treatmentPlan,
      followUpDate,
      followUpInstructions,
      vitalSigns,
      attachments,
      recommendations
    } = body

    // Find the appointment and verify it belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: session.user.id
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Prepare medical record update
    const medicalRecord = {
      consultationNotes: consultationNotes || appointment.consultationNotes,
      prescription: prescription || appointment.prescription,
      diagnosis: diagnosis || appointment.diagnosis,
      treatmentPlan: treatmentPlan || appointment.treatmentPlan,
      followUpDate: followUpDate ? new Date(followUpDate) : appointment.followUpDate,
      followUpInstructions: followUpInstructions || appointment.followUpInstructions,
      vitalSigns: vitalSigns || appointment.vitalSigns,
      attachments: attachments || appointment.attachments,
      recommendations: recommendations || appointment.recommendations,
      consultationCompletedAt: new Date(),
      updatedAt: new Date()
    }

    // Update the appointment with medical records
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      medicalRecord,
      { new: true }
    ).populate([
      { path: 'patientId', select: 'profile.name email profile.phone' },
      { path: 'doctorId', select: 'profile.name profile.specialization profile.licenseNumber' }
    ])

    // Prepare prescription data for response
    const prescriptionData = prescription ? {
      medications: prescription.medications || [],
      instructions: prescription.instructions || '',
      dosage: prescription.dosage || '',
      duration: prescription.duration || '',
      notes: prescription.notes || '',
      issuedAt: new Date(),
      issuedBy: session.user.id
    } : null

    return NextResponse.json({
      success: true,
      message: 'Consultation notes and prescription added successfully',
      appointment: updatedAppointment,
      medicalRecord: {
        consultationNotes,
        diagnosis,
        treatmentPlan,
        followUpDate,
        followUpInstructions,
        vitalSigns,
        recommendations
      },
      prescription: prescriptionData
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding consultation notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/doctors/appointments/[id]/notes - Get consultation notes and medical history
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

    if (!['doctor', 'admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const appointmentId = params.id

    // Find the appointment
    let filter: any = { _id: appointmentId }
    if (session.user.role === 'doctor') {
      filter.doctorId = session.user.id
    }

    const appointment = await Appointment.findOne(filter)
      .populate([
        { path: 'patientId', select: 'profile.name profile.phone profile.address email' },
        { path: 'doctorId', select: 'profile.name profile.specialization profile.licenseNumber' }
      ])

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Get patient's medical history (previous appointments)
    const medicalHistory = await Appointment.find({
      patientId: appointment.patientId,
      status: 'completed',
      consultationNotes: { $exists: true, $ne: null }
    })
    .select('appointmentDate consultationNotes diagnosis prescription treatmentPlan')
    .populate('doctorId', 'profile.name profile.specialization')
    .sort({ appointmentDate: -1 })
    .limit(10)

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment._id,
        appointmentDate: appointment.appointmentDate,
        status: appointment.status,
        consultationType: appointment.consultationType,
        reasonForVisit: appointment.reasonForVisit,
        consultationNotes: appointment.consultationNotes,
        prescription: appointment.prescription,
        diagnosis: appointment.diagnosis,
        treatmentPlan: appointment.treatmentPlan,
        followUpDate: appointment.followUpDate,
        followUpInstructions: appointment.followUpInstructions,
        vitalSigns: appointment.vitalSigns,
        attachments: appointment.attachments,
        recommendations: appointment.recommendations,
        patient: appointment.patientId,
        doctor: appointment.doctorId
      },
      medicalHistory: medicalHistory.map(record => ({
        id: record._id,
        date: record.appointmentDate,
        doctor: record.doctorId,
        consultationNotes: record.consultationNotes,
        diagnosis: record.diagnosis,
        prescription: record.prescription,
        treatmentPlan: record.treatmentPlan
      }))
    })

  } catch (error) {
    console.error('Error fetching consultation notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/doctors/appointments/[id]/notes - Update consultation notes and prescription
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

    // Find the appointment and verify it belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: session.user.id
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updates: any = {
      updatedAt: new Date()
    }

    // Update allowed fields
    const allowedFields = [
      'consultationNotes',
      'prescription',
      'diagnosis', 
      'treatmentPlan',
      'followUpDate',
      'followUpInstructions',
      'vitalSigns',
      'attachments',
      'recommendations'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'followUpDate') {
          updates[field] = new Date(body[field])
        } else {
          updates[field] = body[field]
        }
      }
    }

    // Update the appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updates,
      { new: true }
    ).populate([
      { path: 'patientId', select: 'profile.name email profile.phone' },
      { path: 'doctorId', select: 'profile.name profile.specialization' }
    ])

    return NextResponse.json({
      success: true,
      message: 'Medical records updated successfully',
      appointment: updatedAppointment
    })

  } catch (error) {
    console.error('Error updating consultation notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}