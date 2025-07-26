import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import User from '../../../../../server/models/User'
import Referral from '../../../../../server/models/Referral'
import Appointment from '../../../../../server/models/Appointment'

// GET /api/admin/agents/analytics - Get comprehensive agent analytics
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
    const agentId = searchParams.get('agentId') // specific agent
    
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Build filters
    const agentFilter = agentId ? { _id: agentId } : {}
    const dateFilter = { createdAt: { $gte: startDate } }

    // 1. Overall Agent Statistics
    const overallStats = await Promise.all([
      User.countDocuments({ role: 'agent', ...agentFilter }),
      User.countDocuments({ role: 'agent', isActive: true, ...agentFilter }),
      User.countDocuments({ role: 'agent', isActive: false, ...agentFilter }),
      User.countDocuments({ role: 'agent', ...agentFilter, ...dateFilter })
    ])

    // 2. Referral Code Statistics
    const referralStats = await Referral.aggregate([
      ...(agentId ? [{ $match: { agentId: agentId } }] : []),
      {
        $group: {
          _id: null,
          totalCodes: { $sum: 1 },
          activeCodes: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalUsage: { $sum: '$usageCount' },
          avgUsagePerCode: { $avg: '$usageCount' }
        }
      }
    ])

    // 3. Recent Performance (by period)
    const recentReferralStats = await Referral.aggregate([
      { $match: { createdAt: { $gte: startDate }, ...(agentId ? { agentId } : {}) } },
      {
        $group: {
          _id: null,
          newCodes: { $sum: 1 },
          newUsage: { $sum: '$usageCount' }
        }
      }
    ])

    // 4. Commission Analytics (from appointments with referral codes)
    const commissionStats = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $exists: true, $ne: null },
          appointmentDate: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCommissions: { $sum: '$agentCommission' },
          totalAppointments: { $sum: 1 },
          avgCommissionPerAppointment: { $avg: '$agentCommission' }
        }
      }
    ])

    // 5. Top Performing Agents
    const topAgents = await Referral.aggregate([
      {
        $group: {
          _id: '$agentId',
          totalCodes: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' },
          activeCodes: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      { $sort: { totalUsage: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      { $unwind: '$agent' },
      {
        $project: {
          agentId: '$_id',
          agentName: '$agent.profile.name',
          agentEmail: '$agent.email',
          totalCodes: 1,
          totalUsage: 1,
          activeCodes: 1,
          performanceScore: { $multiply: ['$totalUsage', 10] } // Simple scoring
        }
      }
    ])

    // 6. Monthly Growth Trends
    const monthlyTrends = await User.aggregate([
      {
        $match: {
          role: 'agent',
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } // This year
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newAgents: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])

    // 7. Referral Code Usage Trends
    const usageTrends = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $exists: true, $ne: null },
          appointmentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$appointmentDate'
              }
            }
          },
          referralAppointments: { $sum: 1 },
          totalCommissions: { $sum: '$agentCommission' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ])

    // Compile analytics response
    const analytics = {
      overview: {
        totalAgents: overallStats[0],
        activeAgents: overallStats[1],
        inactiveAgents: overallStats[2],
        newAgentsInPeriod: overallStats[3],
        activationRate: overallStats[0] > 0 ? (overallStats[1] / overallStats[0] * 100).toFixed(1) : 0
      },
      referralCodes: {
        total: referralStats[0]?.totalCodes || 0,
        active: referralStats[0]?.activeCodes || 0,
        totalUsage: referralStats[0]?.totalUsage || 0,
        averageUsage: referralStats[0]?.avgUsagePerCode || 0,
        newCodesInPeriod: recentReferralStats[0]?.newCodes || 0,
        newUsageInPeriod: recentReferralStats[0]?.newUsage || 0
      },
      commissions: {
        totalCommissions: commissionStats[0]?.totalCommissions || 0,
        totalReferralAppointments: commissionStats[0]?.totalAppointments || 0,
        averageCommission: commissionStats[0]?.avgCommissionPerAppointment || 0
      },
      topPerformers: topAgents,
      trends: {
        monthly: monthlyTrends,
        usage: usageTrends
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
    console.error('Error fetching agent analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}