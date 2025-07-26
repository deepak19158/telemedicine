import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Appointment from '../../../../server/models/Appointment'

// GET /api/doctors/appointments - Get doctor's appointments
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
        { error: 'Access denied. Doctor role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const doctorId = session.user.id
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const period = searchParams.get('period') || searchParams.get('days') || '30'
    const date = searchParams.get('date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    console.log('🔍 Doctor appointments API called:', {
      doctorId,
      status,
      period,
      date,
      page,
      limit
    })

    // Build filter
    const filter: any = { doctorId }
    
    if (status && status !== 'all') {
      filter.status = status
    }

    if (date) {
      // Filter for specific date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      filter.appointmentDate = { $gte: startOfDay, $lte: endOfDay }
    } else if (period) {
      // Filter by period
      const daysAgo = parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)
      filter.appointmentDate = { $gte: startDate }
    }

    // Get appointments with pagination
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'profile.name name email profile.phone')
      .sort({ appointmentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const totalAppointments = await Appointment.countDocuments(filter)

    // Get stats for the current filter
    const statsFilter = { doctorId }
    if (period) {
      const daysAgo = parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)
      statsFilter.appointmentDate = { $gte: startDate }
    }

    const stats = {
      todayAppointments: await Appointment.countDocuments({
        doctorId,
        appointmentDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      completedAppointments: await Appointment.countDocuments({
        ...statsFilter,
        status: 'completed'
      }),
      pendingApproval: await Appointment.countDocuments({
        ...statsFilter,
        status: { $in: ['pending', 'pending_approval'] }
      }),
      uniquePatients: await Appointment.aggregate([
        { $match: statsFilter },
        { $group: { _id: '$patientId' } },
        { $count: 'total' }
      ]).then(result => result[0]?.total || 0)
    }

    const responseData = {
      appointments,
      stats: {
        total: totalAppointments,
        today: stats.todayAppointments,
        completed: stats.completedAppointments,
        pending: stats.pendingApproval,
        uniquePatients: stats.uniquePatients
      },
      pagination: {
        current: page,
        pages: Math.ceil(totalAppointments / limit),
        total: totalAppointments
      }
    }
    
    console.log('✅ Doctor appointments API response:', {
      appointmentsCount: appointments.length,
      stats: responseData.stats,
      pagination: responseData.pagination
    })
    
    return NextResponse.json({
      success: true,
      data: responseData,
      message: `Found ${appointments.length} appointments`
    })

  } catch (error) {
    console.error('❌ Error fetching doctor appointments:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        data: null
      },
      { status: 500 }
    )
  }
}

// PUT /api/doctors/appointments/[id] - Update appointment (handled by separate route)