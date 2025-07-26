import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import Appointment from '../../../../server/models/Appointment'

// GET /api/doctors/dashboard - Get doctor dashboard data
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
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))
    
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 7)

    // Get today's stats
    const todayAppointments = await Appointment.countDocuments({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    })

    const todayEarnings = await Appointment.aggregate([
      {
        $match: {
          doctorId: doctorId,
          appointmentDate: { $gte: startOfDay, $lte: endOfDay },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$consultationFee' }
        }
      }
    ])

    const uniquePatientsToday = await Appointment.aggregate([
      {
        $match: {
          doctorId,
          appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: '$patientId'
        }
      },
      {
        $count: 'uniquePatients'
      }
    ])

    // Get weekly stats
    const weeklyAppointments = await Appointment.countDocuments({
      doctorId,
      appointmentDate: { $gte: startOfWeek }
    })

    const weeklyRevenue = await Appointment.aggregate([
      {
        $match: {
          doctorId,
          appointmentDate: { $gte: startOfWeek },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$consultationFee' }
        }
      }
    ])

    // Get recent activity
    const recentActivity = await Appointment.find({
      doctorId,
      updatedAt: { $gte: startOfWeek }
    })
    .populate('patientId', 'profile.name name')
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('status patientId updatedAt consultationNotes')

    const formattedActivity = recentActivity.map(activity => ({
      _id: activity._id,
      type: activity.status === 'completed' ? 'success' : 'info',
      action: activity.status === 'completed' ? 'Consultation Completed' : 'Appointment Updated',
      patient: activity.patientId?.profile?.name || activity.patientId?.name || 'Patient',
      timestamp: activity.updatedAt,
      time: getRelativeTime(activity.updatedAt)
    }))

    const stats = {
      todayAppointments,
      todayPatients: uniquePatientsToday[0]?.uniquePatients || 0,
      todayEarnings: todayEarnings[0]?.total || 0,
      todayConsultations: await Appointment.countDocuments({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed'
      })
    }

    const weeklyStats = {
      appointments: weeklyAppointments,
      revenue: weeklyRevenue[0]?.total || 0,
      rating: 4.8, // This would come from a ratings collection
      responseTime: 5 // This would be calculated from response metrics
    }

    return NextResponse.json({
      stats,
      weeklyStats,
      recentActivity: formattedActivity
    })

  } catch (error) {
    console.error('Error fetching doctor dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) {
    return `${minutes} minutes ago`
  } else if (hours < 24) {
    return `${hours} hours ago`
  } else {
    return `${days} days ago`
  }
}