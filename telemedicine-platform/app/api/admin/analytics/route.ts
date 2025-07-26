import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import Appointment from '../../../../server/models/Appointment'
import Referral from '../../../../server/models/Referral'

// GET /api/admin/analytics - Get comprehensive platform analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)
    
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    
    const lastMonth = new Date(thisMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    // 1. User Statistics
    const userStats = await Promise.all([
      // Total users by role
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'agent' }),
      User.countDocuments({ role: 'admin' }),
      
      // Active users
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      
      // New users in period
      User.countDocuments({ createdAt: { $gte: startDate } }),
      
      // This month vs last month
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      User.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } })
    ])

    // 2. Appointment Statistics
    const appointmentStats = await Promise.all([
      // Total appointments
      Appointment.countDocuments({}),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'scheduled' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      
      // Period-based
      Appointment.countDocuments({ appointmentDate: { $gte: startDate } }),
      Appointment.countDocuments({ 
        appointmentDate: { $gte: startDate },
        status: 'completed'
      }),
      
      // Revenue calculations
      Appointment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$consultationFee' } } }
      ]),
      
      Appointment.aggregate([
        { 
          $match: { 
            status: 'completed',
            appointmentDate: { $gte: startDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$consultationFee' } } }
      ])
    ])

    // 3. Doctor Analytics
    const doctorStats = await Promise.all([
      User.countDocuments({ role: 'doctor', registrationStatus: 'approved' }),
      User.countDocuments({ role: 'doctor', registrationStatus: 'pending' }),
      User.countDocuments({ role: 'doctor', registrationStatus: 'rejected' }),
      
      // Average consultations per doctor
      Appointment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$doctorId', count: { $sum: 1 } } },
        { $group: { _id: null, avg: { $avg: '$count' } } }
      ])
    ])

    // 4. Referral Program Analytics
    const referralStats = await Promise.all([
      Referral.countDocuments({}),
      Referral.countDocuments({ isActive: true }),
      
      // Total usage and commissions
      Referral.aggregate([
        { $group: { _id: null, totalUsage: { $sum: '$usageCount' } } }
      ]),
      
      Appointment.aggregate([
        { 
          $match: { 
            referralCode: { $exists: true, $ne: null },
            status: 'completed'
          }
        },
        { 
          $group: { 
            _id: null, 
            totalCommissions: { $sum: '$agentCommission' },
            referralAppointments: { $sum: 1 }
          }
        }
      ])
    ])

    // 5. Growth Trends (Last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const growthTrends = await Promise.all([
      // User growth by month
      User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              role: '$role'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      
      // Appointment trends
      Appointment.aggregate([
        { $match: { appointmentDate: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$appointmentDate' },
              month: { $month: '$appointmentDate' }
            },
            appointments: { $sum: 1 },
            revenue: { 
              $sum: { 
                $cond: [{ $eq: ['$status', 'completed'] }, '$consultationFee', 0]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ])

    // 6. Performance Metrics
    const performanceMetrics = await Promise.all([
      // Average appointment duration (if tracked)
      Appointment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, avgFee: { $avg: '$consultationFee' } } }
      ]),
      
      // Most popular consultation types
      Appointment.aggregate([
        { $group: { _id: '$consultationType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Cancellation rate
      Appointment.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
          }
        }
      ])
    ])

    // Compile comprehensive analytics
    const analytics = {
      overview: {
        totalUsers: userStats[0] + userStats[1] + userStats[2] + userStats[3],
        totalPatients: userStats[0],
        totalDoctors: userStats[1],
        totalAgents: userStats[2],
        totalAdmins: userStats[3],
        activeUsers: userStats[4],
        inactiveUsers: userStats[5],
        newUsersInPeriod: userStats[6],
        growthRate: userStats[7] > 0 && userStats[8] > 0 
          ? ((userStats[7] - userStats[8]) / userStats[8] * 100).toFixed(1)
          : 0
      },
      
      appointments: {
        total: appointmentStats[0],
        completed: appointmentStats[1],
        scheduled: appointmentStats[2],
        cancelled: appointmentStats[3],
        inPeriod: appointmentStats[4],
        completedInPeriod: appointmentStats[5],
        completionRate: appointmentStats[4] > 0 
          ? (appointmentStats[5] / appointmentStats[4] * 100).toFixed(1)
          : 0
      },
      
      revenue: {
        totalRevenue: appointmentStats[6][0]?.total || 0,
        revenueInPeriod: appointmentStats[7][0]?.total || 0,
        averageConsultationFee: performanceMetrics[0][0]?.avgFee || 0
      },
      
      doctors: {
        approved: doctorStats[0],
        pending: doctorStats[1],
        rejected: doctorStats[2],
        approvalRate: (doctorStats[0] + doctorStats[1] + doctorStats[2]) > 0
          ? (doctorStats[0] / (doctorStats[0] + doctorStats[1] + doctorStats[2]) * 100).toFixed(1)
          : 0,
        avgConsultationsPerDoctor: doctorStats[3][0]?.avg || 0
      },
      
      referralProgram: {
        totalCodes: referralStats[0],
        activeCodes: referralStats[1],
        totalUsage: referralStats[2][0]?.totalUsage || 0,
        totalCommissions: referralStats[3][0]?.totalCommissions || 0,
        referralAppointments: referralStats[3][0]?.referralAppointments || 0,
        conversionRate: referralStats[2][0]?.totalUsage > 0 && referralStats[3][0]?.referralAppointments > 0
          ? (referralStats[3][0].referralAppointments / referralStats[2][0].totalUsage * 100).toFixed(1)
          : 0
      },
      
      performance: {
        consultationTypes: performanceMetrics[1],
        cancellationRate: performanceMetrics[2][0] 
          ? (performanceMetrics[2][0].cancelled / performanceMetrics[2][0].total * 100).toFixed(1)
          : 0
      },
      
      trends: {
        userGrowth: growthTrends[0],
        appointmentTrends: growthTrends[1]
      },
      
      period: {
        days: daysAgo,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Error fetching platform analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}