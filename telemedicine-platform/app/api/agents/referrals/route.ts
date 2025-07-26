import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Referral from '../../../../server/models/Referral'
import Appointment from '../../../../server/models/Appointment'

// GET /api/agents/referrals - Get agent's referral history and tracking
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
    
    const status = searchParams.get('status') // active, inactive, expired, all
    const period = searchParams.get('period') || '30' // days
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build filter for referrals
    const referralFilter: any = { agentId }
    
    if (status && status !== 'all') {
      switch (status) {
        case 'active':
          referralFilter.isActive = true
          referralFilter.expirationDate = { $gte: new Date() }
          break
        case 'inactive':
          referralFilter.isActive = false
          break
        case 'expired':
          referralFilter.expirationDate = { $lt: new Date() }
          break
      }
    }

    // Date filter for period
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get referrals with pagination
    const sortOptions: any = {}
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1

    const referrals = await Referral.find(referralFilter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('assignedBy', 'profile.name')

    const totalReferrals = await Referral.countDocuments(referralFilter)

    // Get detailed usage data for each referral
    const referralDetails = await Promise.all(
      referrals.map(async (referral) => {
        // Get appointments using this referral code
        const appointments = await Appointment.find({
          referralCode: referral.code,
          createdAt: { $gte: startDate }
        })
        .populate('patientId', 'profile.name email')
        .populate('doctorId', 'profile.name profile.specialization')
        .sort({ createdAt: -1 })

        // Calculate period-specific statistics
        const periodStats = {
          totalUsage: appointments.length,
          successfulReferrals: appointments.filter(apt => apt.status !== 'cancelled').length,
          totalCommission: appointments.reduce((sum, apt) => sum + (apt.agentCommission || 0), 0),
          totalDiscount: appointments.reduce((sum, apt) => sum + (apt.discount || 0), 0),
          totalRevenue: appointments.reduce((sum, apt) => sum + (apt.finalAmount || 0), 0)
        }

        // Recent usage activity
        const recentUsage = appointments.slice(0, 5).map(apt => ({
          id: apt._id,
          date: apt.appointmentDate,
          patient: apt.patientId?.profile?.name,
          doctor: apt.doctorId?.profile?.name,
          specialization: apt.doctorId?.profile?.specialization,
          commission: apt.agentCommission,
          discount: apt.discount,
          status: apt.status,
          createdAt: apt.createdAt
        }))

        return {
          id: referral._id,
          code: referral.code,
          description: referral.description,
          discountType: referral.discountType,
          discountValue: referral.discountValue,
          maxDiscountAmount: referral.maxDiscountAmount,
          minOrderAmount: referral.minOrderAmount,
          commissionType: referral.commissionType,
          commissionValue: referral.commissionValue,
          
          // Usage limits
          usageCount: referral.usageCount,
          maxUsage: referral.maxUsage,
          maxUsagePerUser: referral.maxUsagePerUser,
          
          // Status and dates
          isActive: referral.isActive,
          startDate: referral.startDate,
          expirationDate: referral.expirationDate,
          lastUsedAt: referral.lastUsedAt,
          
          // Assignment info
          assignedBy: referral.assignedBy,
          assignedAt: referral.assignedAt,
          
          // Overall statistics
          totalReferrals: referral.totalReferrals,
          successfulReferrals: referral.successfulReferrals,
          totalCommissionEarned: referral.totalCommissionEarned,
          totalDiscountGiven: referral.totalDiscountGiven,
          
          // Virtual properties
          status: referral.status,
          conversionRate: referral.conversionRate,
          avgCommissionPerReferral: referral.avgCommissionPerReferral,
          
          // Period-specific data
          periodStats,
          recentUsage,
          
          // Calculated metrics
          remainingUsage: referral.maxUsage ? referral.maxUsage - referral.usageCount : null,
          daysUntilExpiry: Math.ceil((referral.expirationDate - new Date()) / (1000 * 60 * 60 * 24)),
          isExpiringSoon: referral.expirationDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expires in 7 days
          
          createdAt: referral.createdAt,
          updatedAt: referral.updatedAt
        }
      })
    )

    // Calculate summary statistics
    const summaryStats = {
      totalReferralCodes: totalReferrals,
      activeReferralCodes: referralDetails.filter(r => r.status === 'active').length,
      expiredReferralCodes: referralDetails.filter(r => r.status === 'expired').length,
      totalUsageInPeriod: referralDetails.reduce((sum, r) => sum + r.periodStats.totalUsage, 0),
      totalCommissionInPeriod: referralDetails.reduce((sum, r) => sum + r.periodStats.totalCommission, 0),
      totalDiscountInPeriod: referralDetails.reduce((sum, r) => sum + r.periodStats.totalDiscount, 0),
      averageConversionRate: referralDetails.length > 0 
        ? referralDetails.reduce((sum, r) => sum + r.conversionRate, 0) / referralDetails.length 
        : 0,
      topPerformingCode: referralDetails.sort((a, b) => b.totalCommissionEarned - a.totalCommissionEarned)[0]?.code
    }

    return NextResponse.json({
      success: true,
      referrals: referralDetails,
      summary: summaryStats,
      pagination: {
        current: page,
        pages: Math.ceil(totalReferrals / limit),
        total: totalReferrals,
        limit
      },
      filters: {
        status,
        period: `${period} days`,
        sortBy,
        sortOrder
      }
    })

  } catch (error) {
    console.error('Error fetching agent referrals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}