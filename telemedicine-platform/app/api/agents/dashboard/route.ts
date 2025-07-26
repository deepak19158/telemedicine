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
    const recentAppointments = await Appointment.find({
      referralCode: { $in: referralCodes.map(r => r.code) },
      createdAt: { $gte: startDate }
    })
    .populate('patientId', 'profile.name email')
    .populate('doctorId', 'profile.name profile.specialization')
    .sort({ createdAt: -1 })
    .limit(10)

    // Calculate period statistics
    const periodStats = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodes.map(r => r.code) },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          successfulReferrals: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalCommissionEarned: { $sum: '$agentCommission' },
          totalDiscountGiven: { $sum: '$discount' },
          totalRevenue: { $sum: '$finalAmount' }
        }
      }
    ])

    const currentPeriodStats = periodStats[0] || {
      totalReferrals: 0,
      successfulReferrals: 0,
      totalCommissionEarned: 0,
      totalDiscountGiven: 0,
      totalRevenue: 0
    }

    // Get top performing referral codes
    const topPerformingCodes = await Referral.find({ agentId })
      .sort({ totalCommissionEarned: -1, usageCount: -1 })
      .limit(5)
      .select('code usageCount totalCommissionEarned totalDiscountGiven isActive expirationDate')

    // Calculate conversion rate
    const conversionRate = referralStats.totalUsage > 0 
      ? (currentPeriodStats.successfulReferrals / referralStats.totalUsage) * 100 
      : 0

    // Get commission payment status (mock data - would come from payment system)
    const commissionPayments = {
      pending: referralStats.totalCommission * 0.3, // 30% pending
      paid: referralStats.totalCommission * 0.7,    // 70% paid
      lastPaymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      nextPaymentDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)  // 23 days from now
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent._id,
        name: agent.profile.name,
        agentCode: agent.profile.agentCode,
        commissionRate: agent.profile.commissionRate,
        status: agent.profile.status,
        verificationStatus: agent.profile.verificationStatus
      },
      overview: {
        totalReferralCodes: referralStats.totalCodes,
        activeReferralCodes: referralStats.activeCodes,
        totalReferrals: referralStats.totalUsage,
        successfulReferrals: currentPeriodStats.successfulReferrals,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalCommissionEarned: referralStats.totalCommission,
        totalDiscountGiven: referralStats.totalDiscounts
      },
      periodStats: {
        period: `${period} days`,
        referrals: currentPeriodStats.totalReferrals,
        successful: currentPeriodStats.successfulReferrals,
        commission: currentPeriodStats.totalCommissionEarned,
        discounts: currentPeriodStats.totalDiscountGiven,
        revenue: currentPeriodStats.totalRevenue
      },
      referralCodes: referralCodes.map(code => ({
        id: code._id,
        code: code.code,
        usage: code.usageCount,
        commission: code.totalCommissionEarned,
        discounts: code.totalDiscountGiven,
        isActive: code.isActive,
        expirationDate: code.expirationDate,
        status: code.isActive && code.expirationDate > new Date() ? 'active' : 'inactive'
      })),
      topPerformingCodes: topPerformingCodes.map(code => ({
        code: code.code,
        usage: code.usageCount,
        commission: code.totalCommissionEarned,
        isActive: code.isActive
      })),
      recentActivity: recentAppointments.map(apt => ({
        id: apt._id,
        date: apt.appointmentDate,
        patient: apt.patientId?.profile?.name,
        doctor: apt.doctorId?.profile?.name,
        specialization: apt.doctorId?.profile?.specialization,
        referralCode: apt.referralCode,
        commission: apt.agentCommission,
        discount: apt.discount,
        status: apt.status
      })),
      commissionPayments
    })

  } catch (error) {
    console.error('Error fetching agent dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}