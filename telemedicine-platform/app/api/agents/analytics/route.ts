import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import Referral from '../../../../server/models/Referral'
import Appointment from '../../../../server/models/Appointment'

// GET /api/agents/analytics - Get comprehensive agent analytics and performance metrics
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
    
    // Query parameters for filtering and analysis
    const period = searchParams.get('period') || '30' // days: 7, 30, 90, 365, all
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const metric = searchParams.get('metric') || 'all' // all, referrals, commissions, conversions
    const granularity = searchParams.get('granularity') || 'daily' // daily, weekly, monthly
    const compare = searchParams.get('compare') === 'true' // Compare with previous period

    // Get agent profile
    const agent = await User.findById(agentId)
      .select('profile.name profile.agentCode profile.commissionRate profile.joinedAt profile.status profile.verificationStatus')

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Calculate date ranges
    let currentPeriodStart: Date
    let currentPeriodEnd: Date
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    if (startDate && endDate) {
      currentPeriodStart = new Date(startDate)
      currentPeriodEnd = new Date(endDate)
    } else {
      currentPeriodEnd = new Date()
      if (period === 'all') {
        currentPeriodStart = agent.profile.joinedAt || new Date(agent.createdAt)
      } else {
        const days = parseInt(period)
        currentPeriodStart = new Date()
        currentPeriodStart.setDate(currentPeriodStart.getDate() - days)
      }
    }

    // Calculate previous period for comparison
    const periodLength = currentPeriodEnd.getTime() - currentPeriodStart.getTime()
    previousPeriodEnd = new Date(currentPeriodStart.getTime())
    previousPeriodStart = new Date(currentPeriodStart.getTime() - periodLength)

    // Get agent's referral codes
    const referralCodes = await Referral.find({ agentId })
      .select('code usageCount totalCommissionEarned totalDiscountGiven isActive expirationDate startDate')

    const referralCodeStrings = referralCodes.map(r => r.code)

    // === REFERRAL PERFORMANCE ANALYTICS ===
    
    // Current period referral statistics
    const currentReferralStats = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          successfulReferrals: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalCommission: { $sum: '$agentCommission' },
          totalDiscount: { $sum: '$discount' },
          totalRevenue: { $sum: '$finalAmount' },
          avgCommissionPerReferral: { $avg: '$agentCommission' },
          avgOrderValue: { $avg: '$consultationFee' },
          maxCommission: { $max: '$agentCommission' },
          minCommission: { $min: '$agentCommission' }
        }
      }
    ])

    // Previous period referral statistics (for comparison)
    const previousReferralStats = compare ? await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          successfulReferrals: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalCommission: { $sum: '$agentCommission' },
          totalDiscount: { $sum: '$discount' },
          totalRevenue: { $sum: '$finalAmount' }
        }
      }
    ]) : []

    const currentStats = currentReferralStats[0] || {
      totalReferrals: 0,
      successfulReferrals: 0,
      totalCommission: 0,
      totalDiscount: 0,
      totalRevenue: 0,
      avgCommissionPerReferral: 0,
      avgOrderValue: 0,
      maxCommission: 0,
      minCommission: 0
    }

    const previousStats = previousReferralStats[0] || {
      totalReferrals: 0,
      successfulReferrals: 0,
      totalCommission: 0,
      totalDiscount: 0,
      totalRevenue: 0
    }

    // === TIME-SERIES ANALYTICS ===
    
    let timeSeriesGroupBy: any
    let timeSeriesFormat: string

    switch (granularity) {
      case 'weekly':
        timeSeriesGroupBy = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        }
        timeSeriesFormat = 'weekly'
        break
      case 'monthly':
        timeSeriesGroupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        }
        timeSeriesFormat = 'monthly'
        break
      default: // daily
        timeSeriesGroupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        }
        timeSeriesFormat = 'daily'
    }

    const timeSeriesData = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }
      },
      {
        $group: {
          _id: timeSeriesGroupBy,
          referrals: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] }
          },
          commission: { $sum: '$agentCommission' },
          revenue: { $sum: '$finalAmount' },
          avgOrderValue: { $avg: '$consultationFee' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.week': 1,
          '_id.day': 1
        }
      }
    ])

    // === REFERRAL CODE PERFORMANCE ===
    
    const referralCodePerformance = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }
      },
      {
        $group: {
          _id: '$referralCode',
          totalUsage: { $sum: 1 },
          successfulUsage: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalCommission: { $sum: '$agentCommission' },
          totalDiscount: { $sum: '$discount' },
          totalRevenue: { $sum: '$finalAmount' },
          avgCommission: { $avg: '$agentCommission' },
          avgOrderValue: { $avg: '$consultationFee' },
          lastUsed: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'referrals',
          localField: '_id',
          foreignField: 'code',
          as: 'referralDetails'
        }
      },
      {
        $sort: { totalCommission: -1 }
      }
    ])

    // === CONVERSION FUNNEL ANALYTICS ===
    
    const conversionFunnel = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$finalAmount' },
          avgCommission: { $avg: '$agentCommission' }
        }
      }
    ])

    // === PATIENT ACQUISITION ANALYTICS ===
    
    const patientAcquisition = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }
      },
      {
        $group: {
          _id: '$patientId',
          firstAppointment: { $min: '$createdAt' },
          totalAppointments: { $sum: 1 },
          totalSpent: { $sum: '$finalAmount' },
          totalCommissionGenerated: { $sum: '$agentCommission' },
          referralCodeUsed: { $first: '$referralCode' }
        }
      },
      {
        $group: {
          _id: null,
          newPatients: { $sum: 1 },
          avgLifetimeValue: { $avg: '$totalSpent' },
          avgCommissionPerPatient: { $avg: '$totalCommissionGenerated' },
          totalPatientValue: { $sum: '$totalSpent' }
        }
      }
    ])

    // === DOCTOR SPECIALIZATION ANALYTICS ===
    
    const specializationBreakdown = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: currentPeriodStart, $lte: currentPeriodEnd }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $unwind: '$doctor'
      },
      {
        $group: {
          _id: '$doctor.profile.specialization',
          appointments: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          totalCommission: { $sum: '$agentCommission' },
          avgCommission: { $avg: '$agentCommission' }
        }
      },
      {
        $sort: { totalCommission: -1 }
      }
    ])

    // === MONTHLY TRENDS (last 12 months) ===
    
    const monthlyTrends = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          referrals: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] }
          },
          commission: { $sum: '$agentCommission' },
          revenue: { $sum: '$finalAmount' },
          newPatients: { $addToSet: '$patientId' }
        }
      },
      {
        $addFields: {
          newPatientsCount: { $size: '$newPatients' },
          conversionRate: {
            $cond: [
              { $eq: ['$referrals', 0] },
              0,
              { $multiply: [{ $divide: ['$successful', '$referrals'] }, 100] }
            ]
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 12
      }
    ])

    // === TOP PERFORMING METRICS ===
    
    const topMetrics = {
      bestPerformingCode: referralCodePerformance[0] || null,
      mostProfitableSpecialization: specializationBreakdown[0] || null,
      peakPerformanceDay: timeSeriesData.reduce((max, day) => 
        day.commission > (max?.commission || 0) ? day : max, null),
      consistencyScore: calculateConsistencyScore(timeSeriesData)
    }

    // === GOAL TRACKING ===
    
    const monthlyCommissionGoal = agent.profile.monthlyCommissionGoal || 10000 // Default goal
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)
    
    const currentMonthCommission = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodeStrings },
          createdAt: { $gte: currentMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$agentCommission' }
        }
      }
    ])

    const goalProgress = {
      monthlyGoal: monthlyCommissionGoal,
      currentMonthCommission: currentMonthCommission[0]?.totalCommission || 0,
      goalAchievementPercent: ((currentMonthCommission[0]?.totalCommission || 0) / monthlyCommissionGoal) * 100,
      daysLeftInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate(),
      dailyTargetToReachGoal: monthlyCommissionGoal / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    }

    // === PERFORMANCE CALCULATIONS ===
    
    const conversionRate = currentStats.totalReferrals > 0 
      ? (currentStats.successfulReferrals / currentStats.totalReferrals) * 100 
      : 0

    const growthMetrics = compare ? {
      referralGrowth: calculateGrowthRate(previousStats.totalReferrals, currentStats.totalReferrals),
      commissionGrowth: calculateGrowthRate(previousStats.totalCommission, currentStats.totalCommission),
      revenueGrowth: calculateGrowthRate(previousStats.totalRevenue, currentStats.totalRevenue),
      conversionRateChange: calculateGrowthRate(
        previousStats.totalReferrals > 0 ? (previousStats.successfulReferrals / previousStats.totalReferrals) * 100 : 0,
        conversionRate
      )
    } : null

    const performanceMetrics = {
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgCommissionPerReferral: Math.round(currentStats.avgCommissionPerReferral * 100) / 100,
      avgOrderValue: Math.round(currentStats.avgOrderValue * 100) / 100,
      commissionEfficiency: currentStats.totalRevenue > 0 
        ? Math.round((currentStats.totalCommission / currentStats.totalRevenue) * 10000) / 100 
        : 0, // Commission as % of revenue
      patientRetentionRate: patientAcquisition[0] 
        ? Math.round((patientAcquisition[0].totalPatientValue / (patientAcquisition[0].newPatients * patientAcquisition[0].avgLifetimeValue)) * 10000) / 100
        : 0
    }

    // === INSIGHTS AND RECOMMENDATIONS ===
    
    const insights = generateInsights(currentStats, performanceMetrics, referralCodePerformance, timeSeriesData)
    const recommendations = generateRecommendations(performanceMetrics, referralCodePerformance, specializationBreakdown)

    return NextResponse.json({
      success: true,
      agent: {
        id: agent._id,
        name: agent.profile.name,
        agentCode: agent.profile.agentCode,
        commissionRate: agent.profile.commissionRate,
        status: agent.profile.status,
        verificationStatus: agent.profile.verificationStatus,
        joinedAt: agent.profile.joinedAt
      },
      period: {
        start: currentPeriodStart,
        end: currentPeriodEnd,
        granularity: timeSeriesFormat,
        comparison: compare
      },
      overview: {
        totalReferralCodes: referralCodes.length,
        activeReferralCodes: referralCodes.filter(r => r.isActive && r.expirationDate > new Date()).length,
        ...currentStats,
        ...performanceMetrics
      },
      comparison: growthMetrics,
      timeSeries: {
        granularity: timeSeriesFormat,
        data: timeSeriesData.map(point => ({
          period: formatTimePeriod(point._id, timeSeriesFormat),
          date: constructDateFromPeriod(point._id, timeSeriesFormat),
          referrals: point.referrals,
          successful: point.successful,
          commission: Math.round(point.commission * 100) / 100,
          revenue: Math.round(point.revenue * 100) / 100,
          conversionRate: point.referrals > 0 ? Math.round((point.successful / point.referrals) * 10000) / 100 : 0,
          avgOrderValue: Math.round(point.avgOrderValue * 100) / 100
        }))
      },
      referralCodePerformance: referralCodePerformance.map(code => ({
        code: code._id,
        totalUsage: code.totalUsage,
        successfulUsage: code.successfulUsage,
        conversionRate: code.totalUsage > 0 ? Math.round((code.successfulUsage / code.totalUsage) * 10000) / 100 : 0,
        totalCommission: Math.round(code.totalCommission * 100) / 100,
        totalDiscount: Math.round(code.totalDiscount * 100) / 100,
        totalRevenue: Math.round(code.totalRevenue * 100) / 100,
        avgCommission: Math.round(code.avgCommission * 100) / 100,
        avgOrderValue: Math.round(code.avgOrderValue * 100) / 100,
        lastUsed: code.lastUsed,
        details: code.referralDetails[0] || null
      })),
      conversionFunnel: conversionFunnel.map(stage => ({
        status: stage._id,
        count: stage.count,
        totalValue: Math.round(stage.totalValue * 100) / 100,
        avgCommission: Math.round(stage.avgCommission * 100) / 100,
        percentage: currentStats.totalReferrals > 0 
          ? Math.round((stage.count / currentStats.totalReferrals) * 10000) / 100 
          : 0
      })),
      patientAcquisition: patientAcquisition[0] ? {
        newPatients: patientAcquisition[0].newPatients,
        avgLifetimeValue: Math.round(patientAcquisition[0].avgLifetimeValue * 100) / 100,
        avgCommissionPerPatient: Math.round(patientAcquisition[0].avgCommissionPerPatient * 100) / 100,
        totalPatientValue: Math.round(patientAcquisition[0].totalPatientValue * 100) / 100
      } : null,
      specializationBreakdown: specializationBreakdown.map(spec => ({
        specialization: spec._id,
        appointments: spec.appointments,
        totalRevenue: Math.round(spec.totalRevenue * 100) / 100,
        totalCommission: Math.round(spec.totalCommission * 100) / 100,
        avgCommission: Math.round(spec.avgCommission * 100) / 100,
        marketShare: currentStats.totalReferrals > 0 
          ? Math.round((spec.appointments / currentStats.totalReferrals) * 10000) / 100 
          : 0
      })),
      monthlyTrends: monthlyTrends.map(month => ({
        year: month._id.year,
        month: month._id.month,
        monthName: new Date(month._id.year, month._id.month - 1).toLocaleString('default', { month: 'long' }),
        referrals: month.referrals,
        successful: month.successful,
        commission: Math.round(month.commission * 100) / 100,
        revenue: Math.round(month.revenue * 100) / 100,
        newPatients: month.newPatientsCount,
        conversionRate: Math.round(month.conversionRate * 100) / 100
      })),
      topMetrics,
      goalProgress,
      insights,
      recommendations
    })

  } catch (error) {
    console.error('Error fetching agent analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions

function calculateGrowthRate(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 10000) / 100
}

function calculateConsistencyScore(timeSeriesData: any[]): number {
  if (timeSeriesData.length < 2) return 0
  
  const commissions = timeSeriesData.map(d => d.commission)
  const mean = commissions.reduce((sum, val) => sum + val, 0) / commissions.length
  const variance = commissions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / commissions.length
  const stdDev = Math.sqrt(variance)
  
  // Lower coefficient of variation = higher consistency
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0
  return Math.max(0, Math.round((1 - coefficientOfVariation) * 10000) / 100)
}

function formatTimePeriod(period: any, granularity: string): string {
  switch (granularity) {
    case 'weekly':
      return `${period.year}-W${period.week}`
    case 'monthly':
      return `${period.year}-${period.month.toString().padStart(2, '0')}`
    default: // daily
      return `${period.year}-${period.month.toString().padStart(2, '0')}-${period.day.toString().padStart(2, '0')}`
  }
}

function constructDateFromPeriod(period: any, granularity: string): Date {
  switch (granularity) {
    case 'weekly':
      const firstDayOfYear = new Date(period.year, 0, 1)
      const daysOffset = (period.week - 1) * 7
      return new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
    case 'monthly':
      return new Date(period.year, period.month - 1, 1)
    default: // daily
      return new Date(period.year, period.month - 1, period.day)
  }
}

function generateInsights(stats: any, metrics: any, codePerformance: any[], timeSeriesData: any[]): string[] {
  const insights: string[] = []
  
  if (metrics.conversionRate > 80) {
    insights.push(`Excellent conversion rate of ${metrics.conversionRate}% - you're converting most referrals successfully!`)
  } else if (metrics.conversionRate < 50) {
    insights.push(`Conversion rate of ${metrics.conversionRate}% has room for improvement. Consider focusing on referral quality.`)
  }
  
  if (codePerformance.length > 0) {
    const topCode = codePerformance[0]
    insights.push(`Your best performing code "${topCode._id}" generated ${topCode.totalCommission.toFixed(2)} in commission.`)
  }
  
  if (timeSeriesData.length > 7) {
    const recentAvg = timeSeriesData.slice(-7).reduce((sum, d) => sum + d.commission, 0) / 7
    const earlierAvg = timeSeriesData.slice(0, 7).reduce((sum, d) => sum + d.commission, 0) / 7
    if (recentAvg > earlierAvg * 1.2) {
      insights.push("Your performance has been trending upward recently - keep up the great work!")
    }
  }
  
  if (metrics.avgCommissionPerReferral > 0) {
    insights.push(`You earn an average of ${metrics.avgCommissionPerReferral.toFixed(2)} per successful referral.`)
  }
  
  return insights
}

function generateRecommendations(metrics: any, codePerformance: any[], specializationBreakdown: any[]): string[] {
  const recommendations: string[] = []
  
  if (metrics.conversionRate < 70) {
    recommendations.push("Focus on referring patients who are more likely to complete their appointments to improve conversion rate.")
  }
  
  if (codePerformance.length > 1) {
    const topCode = codePerformance[0]
    const secondCode = codePerformance[1]
    if (topCode.totalCommission > secondCode.totalCommission * 2) {
      recommendations.push(`Your code "${topCode._id}" is significantly outperforming others. Consider promoting it more actively.`)
    }
  }
  
  if (specializationBreakdown.length > 0) {
    const topSpecialization = specializationBreakdown[0]
    recommendations.push(`Focus on referring patients to ${topSpecialization._id} specialists as they generate the highest commissions.`)
  }
  
  if (metrics.avgOrderValue < 1000) {
    recommendations.push("Consider referring patients for higher-value consultations to increase your average commission.")
  }
  
  recommendations.push("Regularly follow up with referred patients to ensure they complete their appointments.")
  
  return recommendations
}