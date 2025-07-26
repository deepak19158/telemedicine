import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import Referral from '../../../../server/models/Referral'
import Appointment from '../../../../server/models/Appointment'

// GET /api/agents/dashboard - Get agent dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'agent') {
      return NextResponse.json(
        { error: 'Access denied. Agent role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const agentId = session.user.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days

    // Get agent profile
    const agent = await User.findById(agentId)
      .select('profile.name profile.agentCode profile.commissionRate profile.status profile.verificationStatus')

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Date filter for the specified period
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get agent's referral codes
    const referralCodes = await Referral.find({ agentId })
      .select('code usageCount totalCommissionEarned totalDiscountGiven isActive expirationDate')

    // Calculate total referral statistics
    const totalReferralStats = await Referral.aggregate([
      { $match: { agentId: agentId } },
      {
        $group: {
          _id: null,
          totalCodes: { $sum: 1 },
          activeCodes: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$isActive', true] },
                    { $gte: ['$expirationDate', new Date()] }
                  ]
                }, 
                1, 
                0
              ]
            }
          },
          totalUsage: { $sum: '$usageCount' },
          totalCommission: { $sum: '$totalCommissionEarned' },
          totalDiscounts: { $sum: '$totalDiscountGiven' }
        }
      }
    ])

    const referralStats = totalReferralStats[0] || {
      totalCodes: 0,
      activeCodes: 0,
      totalUsage: 0,
      totalCommission: 0,
      totalDiscounts: 0
    }

    // Get recent appointments with referral codes
    const recentAppointments = await Appointment.find({\n      referralCode: { $in: referralCodes.map(r => r.code) },\n      createdAt: { $gte: startDate }\n    })\n    .populate('patientId', 'profile.name email')\n    .populate('doctorId', 'profile.name profile.specialization')\n    .sort({ createdAt: -1 })\n    .limit(10)\n\n    // Calculate period statistics\n    const periodStats = await Appointment.aggregate([\n      {\n        $match: {\n          referralCode: { $in: referralCodes.map(r => r.code) },\n          createdAt: { $gte: startDate }\n        }\n      },\n      {\n        $group: {\n          _id: null,\n          totalReferrals: { $sum: 1 },\n          successfulReferrals: {\n            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] }\n          },\n          totalCommissionEarned: { $sum: '$agentCommission' },\n          totalDiscountGiven: { $sum: '$discount' },\n          totalRevenue: { $sum: '$finalAmount' }\n        }\n      }\n    ])\n\n    const currentPeriodStats = periodStats[0] || {\n      totalReferrals: 0,\n      successfulReferrals: 0,\n      totalCommissionEarned: 0,\n      totalDiscountGiven: 0,\n      totalRevenue: 0\n    }\n\n    // Get top performing referral codes\n    const topPerformingCodes = await Referral.find({ agentId })\n      .sort({ totalCommissionEarned: -1, usageCount: -1 })\n      .limit(5)\n      .select('code usageCount totalCommissionEarned totalDiscountGiven isActive expirationDate')\n\n    // Calculate conversion rate\n    const conversionRate = referralStats.totalUsage > 0 \n      ? (currentPeriodStats.successfulReferrals / referralStats.totalUsage) * 100 \n      : 0\n\n    // Get commission payment status (mock data - would come from payment system)\n    const commissionPayments = {\n      pending: referralStats.totalCommission * 0.3, // 30% pending\n      paid: referralStats.totalCommission * 0.7,    // 70% paid\n      lastPaymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago\n      nextPaymentDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)  // 23 days from now\n    }\n\n    return NextResponse.json({\n      success: true,\n      agent: {\n        id: agent._id,\n        name: agent.profile.name,\n        agentCode: agent.profile.agentCode,\n        commissionRate: agent.profile.commissionRate,\n        status: agent.profile.status,\n        verificationStatus: agent.profile.verificationStatus\n      },\n      overview: {\n        totalReferralCodes: referralStats.totalCodes,\n        activeReferralCodes: referralStats.activeCodes,\n        totalReferrals: referralStats.totalUsage,\n        successfulReferrals: currentPeriodStats.successfulReferrals,\n        conversionRate: Math.round(conversionRate * 100) / 100,\n        totalCommissionEarned: referralStats.totalCommission,\n        totalDiscountGiven: referralStats.totalDiscounts\n      },\n      periodStats: {\n        period: `${period} days`,\n        referrals: currentPeriodStats.totalReferrals,\n        successful: currentPeriodStats.successfulReferrals,\n        commission: currentPeriodStats.totalCommissionEarned,\n        discounts: currentPeriodStats.totalDiscountGiven,\n        revenue: currentPeriodStats.totalRevenue\n      },\n      referralCodes: referralCodes.map(code => ({\n        id: code._id,\n        code: code.code,\n        usage: code.usageCount,\n        commission: code.totalCommissionEarned,\n        discounts: code.totalDiscountGiven,\n        isActive: code.isActive,\n        expirationDate: code.expirationDate,\n        status: code.isActive && code.expirationDate > new Date() ? 'active' : 'inactive'\n      })),\n      topPerformingCodes: topPerformingCodes.map(code => ({\n        code: code.code,\n        usage: code.usageCount,\n        commission: code.totalCommissionEarned,\n        isActive: code.isActive\n      })),\n      recentActivity: recentAppointments.map(apt => ({\n        id: apt._id,\n        date: apt.appointmentDate,\n        patient: apt.patientId?.profile?.name,\n        doctor: apt.doctorId?.profile?.name,\n        specialization: apt.doctorId?.profile?.specialization,\n        referralCode: apt.referralCode,\n        commission: apt.agentCommission,\n        discount: apt.discount,\n        status: apt.status\n      })),\n      commissionPayments\n    })\n\n  } catch (error) {\n    console.error('Error fetching agent dashboard:', error)\n    return NextResponse.json(\n      { error: 'Internal server error' },\n      { status: 500 }\n    )\n  }\n}