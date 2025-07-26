import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Payment from '../../../../server/models/Payment'

// GET /api/payments/history - Get payment history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentMethod = searchParams.get('paymentMethod')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build filter based on user role
    let filter: any = {}

    if (session.user.role === 'patient') {
      filter.patientId = session.user.id
    } else if (session.user.role === 'doctor') {
      filter.doctorId = session.user.id
    } else if (session.user.role === 'agent') {
      // Agents can see payments where they earned commission
      filter.$or = [
        { 'metadata.agentId': session.user.id },
        { agentCommission: { $gt: 0 } }
      ]
    } else if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Add additional filters
    if (status && status !== 'all') {
      filter.status = status
    }

    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod
    }

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    // Get payments with pagination
    const payments = await Payment.find(filter)
      .populate('appointmentId', 'appointmentDate consultationType reasonForVisit status')
      .populate('patientId', 'profile.name email')
      .populate('doctorId', 'profile.name profile.specialization')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const totalPayments = await Payment.countDocuments(filter)

    // Calculate summary statistics
    const summaryStats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCommission: { $sum: '$agentCommission' },
          totalDiscount: { $sum: '$discount' },
          completedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          razorpayPayments: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'razorpay'] }, 1, 0] }
          },
          payuPayments: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'payu'] }, 1, 0] }
          },
          cashPayments: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash_via_agent'] }, 1, 0] }
          }
        }
      }
    ])

    const summary = summaryStats[0] || {
      totalAmount: 0,
      totalCommission: 0,
      totalDiscount: 0,
      completedPayments: 0,
      failedPayments: 0,
      pendingPayments: 0,
      razorpayPayments: 0,
      payuPayments: 0,
      cashPayments: 0
    }

    // Format payment data for response
    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      amount: payment.amount,
      finalAmount: payment.finalAmount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId,
      discount: payment.discount,
      agentCommission: payment.agentCommission,
      referralCode: payment.referralCode,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      failureReason: payment.failureReason,
      appointment: payment.appointmentId ? {
        id: payment.appointmentId._id,
        date: payment.appointmentId.appointmentDate,
        type: payment.appointmentId.consultationType,
        reason: payment.appointmentId.reasonForVisit,
        status: payment.appointmentId.status
      } : null,
      patient: payment.patientId ? {
        id: payment.patientId._id,
        name: payment.patientId.profile?.name,
        email: payment.patientId.email
      } : null,
      doctor: payment.doctorId ? {
        id: payment.doctorId._id,
        name: payment.doctorId.profile?.name,
        specialization: payment.doctorId.profile?.specialization
      } : null,
      metadata: session.user.role === 'admin' ? payment.metadata : undefined
    }))

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
      summary,
      pagination: {
        current: page,
        pages: Math.ceil(totalPayments / limit),
        total: totalPayments,
        limit
      },
      filters: {
        status,
        paymentMethod,
        startDate,
        endDate,
        userRole: session.user.role
      }
    })

  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}