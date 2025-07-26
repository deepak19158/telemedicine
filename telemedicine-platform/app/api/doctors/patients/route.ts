import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import Appointment from '../../../../server/models/Appointment'

// GET /api/doctors/patients - Get patients assigned to the doctor
export async function GET(request: NextRequest) {
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
        { error: 'Access denied. Only doctors can access this endpoint.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const riskLevel = searchParams.get('riskLevel') || 'all'

    // Build base filter for patients who have appointments with this doctor
    let baseFilter: any = {}
    
    // Get all patients who have had appointments with this doctor
    const doctorAppointments = await Appointment.find({ 
      doctorId: session.user.id 
    }).distinct('patientId')

    if (doctorAppointments.length === 0) {
      return NextResponse.json({
        success: true,
        patients: [],
        stats: {
          total: 0,
          active: 0,
          upcoming: 0,
          highRisk: 0
        },
        pagination: {
          current: page,
          pages: 0,
          total: 0,
          limit
        }
      })
    }

    baseFilter._id = { $in: doctorAppointments }

    // Add search filter
    if (search) {
      baseFilter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } }
      ]
    }

    // Add status filter
    if (status !== 'all') {
      baseFilter.isActive = status === 'active'
    }

    // Add risk level filter (this would need to be added to User schema if needed)
    if (riskLevel !== 'all') {
      baseFilter['profile.riskLevel'] = riskLevel
    }

    // Get patients with pagination
    const patients = await User.find(baseFilter)
      .select('profile email isActive createdAt updatedAt')
      .sort({ 'profile.name': 1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const totalPatients = await User.countDocuments(baseFilter)

    // Get enhanced patient data with appointment info
    const enhancedPatients = await Promise.all(
      patients.map(async (patient) => {
        // Get patient's appointment history with this doctor
        const appointments = await Appointment.find({
          patientId: patient._id,
          doctorId: session.user.id
        }).sort({ appointmentDate: -1 })

        const lastAppointment = appointments[0]
        const nextAppointment = appointments.find(apt => 
          apt.appointmentDate > new Date() && apt.status === 'scheduled'
        )

        return {
          _id: patient._id,
          profile: patient.profile,
          email: patient.email,
          status: patient.isActive ? 'active' : 'inactive',
          riskLevel: patient.profile?.riskLevel || 'low',
          lastVisit: lastAppointment?.appointmentDate,
          nextAppointment: nextAppointment?.appointmentDate,
          totalConsultations: appointments.length,
          medicalCondition: lastAppointment?.reasonForVisit || 'General consultation',
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt
        }
      })
    )

    // Calculate statistics
    const stats = {
      total: totalPatients,
      active: enhancedPatients.filter(p => p.status === 'active').length,
      upcoming: enhancedPatients.filter(p => p.nextAppointment).length,
      highRisk: enhancedPatients.filter(p => p.riskLevel === 'high').length
    }

    return NextResponse.json({
      success: true,
      patients: enhancedPatients,
      stats,
      pagination: {
        current: page,
        pages: Math.ceil(totalPatients / limit),
        total: totalPatients,
        limit
      }
    })

  } catch (error) {
    console.error('Error fetching doctor patients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}