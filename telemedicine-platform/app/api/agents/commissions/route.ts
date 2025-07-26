import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import Referral from '../../../../server/models/Referral'
import Appointment from '../../../../server/models/Appointment'

// GET /api/agents/commissions - Get agent commission details and payment history
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
    const status = searchParams.get('status') || 'all' // all, pending, paid, processing
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get agent profile with commission rate
    const agent = await User.findById(agentId)
      .select('profile.name profile.agentCode profile.commissionRate profile.bankDetails')

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Set date range
    let dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    } else {
      const daysAgo = parseInt(period)
      const periodStartDate = new Date()
      periodStartDate.setDate(periodStartDate.getDate() - daysAgo)
      dateFilter.createdAt = { $gte: periodStartDate }
    }

    // Get agent's referral codes
    const referralCodes = await Referral.find({ agentId })
      .select('code totalCommissionEarned')

    // Get commission-earning appointments
    const appointmentFilter = {
      referralCode: { $in: referralCodes.map(r => r.code) },
      status: { $ne: 'cancelled' }, // Only non-cancelled appointments earn commission
      agentCommission: { $gt: 0 },
      ...dateFilter
    }

    // Get detailed commission transactions
    const commissionTransactions = await Appointment.find(appointmentFilter)
      .populate('patientId', 'profile.name email')
      .populate('doctorId', 'profile.name profile.specialization')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const totalTransactions = await Appointment.countDocuments(appointmentFilter)

    // Calculate commission summary
    const commissionSummary = await Appointment.aggregate([
      { $match: appointmentFilter },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$agentCommission' },
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          totalDiscount: { $sum: '$discount' },
          avgCommissionPerTransaction: { $avg: '$agentCommission' },
          maxCommission: { $max: '$agentCommission' },
          minCommission: { $min: '$agentCommission' }
        }
      }
    ])

    const summary = commissionSummary[0] || {
      totalCommission: 0,
      totalTransactions: 0,
      totalRevenue: 0,
      totalDiscount: 0,
      avgCommissionPerTransaction: 0,
      maxCommission: 0,
      minCommission: 0
    }

    // Get commission breakdown by month (last 6 months)
    const monthlyBreakdown = await Appointment.aggregate([
      {
        $match: {
          referralCode: { $in: referralCodes.map(r => r.code) },
          status: { $ne: 'cancelled' },
          agentCommission: { $gt: 0 },
          createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } // 6 months
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalCommission: { $sum: '$agentCommission' },
          transactionCount: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    // Get commission by referral code
    const commissionByCode = await Appointment.aggregate([
      { $match: appointmentFilter },
      {
        $group: {
          _id: '$referralCode',
          totalCommission: { $sum: '$agentCommission' },
          transactionCount: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          avgCommission: { $avg: '$agentCommission' }
        }
      },
      {
        $sort: { totalCommission: -1 }
      }
    ])

    // Mock payment history (in real implementation, this would come from payment system)
    const paymentHistory = [
      {
        id: 'PAY001',
        amount: summary.totalCommission * 0.4,
        status: 'paid',
        paymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        paymentMethod: 'bank_transfer',
        transactionId: 'TXN123456789',
        period: {
          start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      {
        id: 'PAY002',
        amount: summary.totalCommission * 0.3,
        status: 'processing',
        requestedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        expectedPaymentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        paymentMethod: 'bank_transfer',
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      }
    ]

    // Calculate pending commission
    const pendingCommission = summary.totalCommission * 0.3 // Remaining 30%

    // Format transaction details
    const transactionDetails = commissionTransactions.map(transaction => ({
      id: transaction._id,
      date: transaction.appointmentDate,
      transactionDate: transaction.createdAt,
      patient: {
        name: transaction.patientId?.profile?.name,
        email: transaction.patientId?.email
      },
      doctor: {
        name: transaction.doctorId?.profile?.name,
        specialization: transaction.doctorId?.profile?.specialization
      },
      referralCode: transaction.referralCode,
      consultationFee: transaction.consultationFee,
      discount: transaction.discount,
      finalAmount: transaction.finalAmount,
      commission: transaction.agentCommission,
      commissionRate: agent.profile.commissionRate,
      status: transaction.status,
      paymentStatus: 'pending' // Would be determined by payment system
    }))

    return NextResponse.json({
      success: true,
      agent: {
        id: agent._id,
        name: agent.profile.name,
        agentCode: agent.profile.agentCode,
        commissionRate: agent.profile.commissionRate,
        bankDetails: agent.profile.bankDetails
      },
      commissionSummary: {
        ...summary,
        pendingCommission,
        commissionRate: agent.profile.commissionRate,
        period: period === '30' ? '30 days' : `${startDate} to ${endDate}`
      },
      monthlyBreakdown: monthlyBreakdown.map(month => ({
        year: month._id.year,
        month: month._id.month,
        monthName: new Date(month._id.year, month._id.month - 1).toLocaleString('default', { month: 'long' }),
        commission: month.totalCommission,
        transactions: month.transactionCount,
        revenue: month.totalRevenue
      })),
      commissionByReferralCode: commissionByCode.map(code => ({
        referralCode: code._id,
        commission: code.totalCommission,
        transactions: code.transactionCount,
        revenue: code.totalRevenue,
        avgCommission: code.avgCommission
      })),
      transactions: transactionDetails,
      paymentHistory,
      pagination: {
        current: page,
        pages: Math.ceil(totalTransactions / limit),
        total: totalTransactions,
        limit
      }
    })

  } catch (error) {
    console.error('Error fetching agent commissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}