import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import User from '../../../../../server/models/User'
import Appointment from '../../../../../server/models/Appointment'

// GET /api/patients/doctors/assigned - Get patient's assigned doctor
export async function GET(request: NextRequest) {
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
    
    // Get patient's assigned doctor
    const patient = await User.findById(session.user.id)
      .select('profile.assignedDoctor')
      .populate({
        path: 'profile.assignedDoctor',
        select: 'profile.name profile.specialization profile.consultationFee profile.phone profile.experience profile.qualifications isActive',
        match: { isActive: true }
      })

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    if (!patient.profile?.assignedDoctor) {
      return NextResponse.json({
        success: true,
        assignedDoctor: null,
        message: 'No doctor assigned yet. Please contact admin for doctor assignment.'
      })
    }

    const assignedDoctor = patient.profile.assignedDoctor

    // Get recent appointment statistics with this doctor
    const appointmentStats = await Appointment.aggregate([
      {
        $match: {
          patientId: session.user.id,
          doctorId: assignedDoctor._id
        }
      },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          upcomingAppointments: {
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $in: ['$status', ['scheduled', 'confirmed']] },
                    { $gte: ['$appointmentDate', new Date()] }
                  ]
                }, 
                1, 
                0
              ]
            }
          },
          lastAppointmentDate: { $max: '$appointmentDate' }
        }
      }
    ])

    const stats = appointmentStats[0] || {
      totalAppointments: 0,
      completedAppointments: 0,
      upcomingAppointments: 0,
      lastAppointmentDate: null
    }

    // Get next available appointment slots (next 7 days, excluding booked slots)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)

    const bookedSlots = await Appointment.find({
      doctorId: assignedDoctor._id,
      appointmentDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('appointmentDate')

    const bookedTimes = bookedSlots.map(slot => slot.appointmentDate.toISOString())

    return NextResponse.json({
      success: true,
      assignedDoctor: {
        id: assignedDoctor._id,
        name: assignedDoctor.profile.name,
        specialization: assignedDoctor.profile.specialization,
        consultationFee: assignedDoctor.profile.consultationFee || 500,
        phone: assignedDoctor.profile.phone,
        experience: assignedDoctor.profile.experience,
        qualifications: assignedDoctor.profile.qualifications,
        isActive: assignedDoctor.isActive
      },
      appointmentHistory: stats,
      bookedSlots: bookedTimes
    })

  } catch (error) {
    console.error('Error fetching assigned doctor:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}