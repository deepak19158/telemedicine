import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Payment from '../../../../server/models/Payment'
import Appointment from '../../../../server/models/Appointment'
import Referral from '../../../../server/models/Referral'
import Razorpay from 'razorpay'

// Initialize Razorpay for refunds
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// POST /api/payments/refund - Process payment refund
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin and doctors can process refunds
    if (!['admin', 'doctor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. Only admin and doctors can process refunds.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const { paymentId, refundAmount, reason, refundType = 'partial' } = body

    if (!paymentId || !reason) {
      return NextResponse.json(
        { error: 'Payment ID and reason are required' },
        { status: 400 }
      )
    }

    // Find the payment record
    let paymentFilter: any = { _id: paymentId, status: 'completed' }
    
    // If doctor, they can only refund their own appointments
    if (session.user.role === 'doctor') {
      paymentFilter.doctorId = session.user.id
    }

    const payment = await Payment.findOne(paymentFilter)
      .populate('appointmentId', 'status appointmentDate consultationType')
      .populate('patientId', 'profile.name email')
      .populate('doctorId', 'profile.name')

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found or not eligible for refund' },
        { status: 404 }
      )
    }

    // Check if already refunded
    if (payment.refundStatus === 'completed') {
      return NextResponse.json(
        { error: 'Payment has already been refunded' },
        { status: 400 }
      )
    }

    // Determine refund amount
    const maxRefundAmount = payment.amount - (payment.refundedAmount || 0)
    const actualRefundAmount = refundType === 'full' 
      ? maxRefundAmount 
      : Math.min(refundAmount || maxRefundAmount, maxRefundAmount)

    if (actualRefundAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      )
    }

    let refundResult = null
    let refundId = null

    // Process refund based on payment method
    if (payment.paymentMethod === 'razorpay') {
      try {
        // Process Razorpay refund
        refundResult = await razorpay.payments.refund(payment.gatewayPaymentId, {
          amount: Math.round(actualRefundAmount * 100), // Amount in paise
          notes: {
            reason: reason,
            refund_type: refundType,
            processed_by: session.user.id
          }
        })
        refundId = refundResult.id
      } catch (error: any) {
        console.error('Razorpay refund error:', error)
        return NextResponse.json(
          { error: `Razorpay refund failed: ${error.error?.description || error.message}` },
          { status: 400 }
        )
      }
    } else if (payment.paymentMethod === 'payu') {
      // PayU refunds are typically manual process
      // For now, we'll mark it as pending and require manual processing
      refundId = `PAYU_REFUND_${payment._id}_${Date.now()}`
      refundResult = {
        id: refundId,
        status: 'pending',
        manual_processing_required: true
      }
    } else if (payment.paymentMethod === 'cash_via_agent') {
      // Cash refunds are manual
      refundId = `CASH_REFUND_${payment._id}_${Date.now()}`
      refundResult = {
        id: refundId,
        status: 'manual',
        cash_refund: true
      }
    }

    // Update payment record
    const currentRefundedAmount = payment.refundedAmount || 0
    const newRefundedAmount = currentRefundedAmount + actualRefundAmount
    const isFullyRefunded = newRefundedAmount >= payment.amount

    payment.refundedAmount = newRefundedAmount
    payment.refundStatus = isFullyRefunded ? 'completed' : 'partial'
    payment.refundHistory = payment.refundHistory || []
    payment.refundHistory.push({
      refundId: refundId,
      amount: actualRefundAmount,
      reason: reason,
      refundType: refundType,
      processedBy: session.user.id,
      processedAt: new Date(),
      gatewayResponse: refundResult,
      status: refundResult?.status || 'completed'
    })
    payment.updatedAt = new Date()

    await payment.save()

    // Update appointment if fully refunded
    if (isFullyRefunded) {
      const appointment = await Appointment.findById(payment.appointmentId)
      if (appointment) {
        appointment.paymentStatus = 'refunded'
        appointment.status = 'cancelled'
        appointment.cancellationReason = `Payment refunded: ${reason}`
        appointment.cancelledAt = new Date()
        appointment.cancelledBy = session.user.id
        appointment.updatedAt = new Date()
        await appointment.save()
      }
    }

    // Reverse referral statistics if applicable
    if (payment.referralCode && payment.agentCommission > 0 && isFullyRefunded) {
      await Referral.findOneAndUpdate(
        { code: payment.referralCode },
        {
          $inc: { 
            successfulReferrals: -1,
            totalCommissionEarned: -payment.agentCommission
          }
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refundId,
        amount: actualRefundAmount,
        currency: payment.currency,
        status: refundResult?.status || 'completed',
        paymentMethod: payment.paymentMethod,
        processedAt: new Date(),
        reason: reason
      },
      payment: {
        id: payment._id,
        originalAmount: payment.amount,
        refundedAmount: newRefundedAmount,
        remainingAmount: payment.amount - newRefundedAmount,
        refundStatus: payment.refundStatus
      },
      gatewayResponse: refundResult
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/payments/refund - Get refund details or history
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
    const paymentId = searchParams.get('paymentId')
    const refundId = searchParams.get('refundId')

    if (paymentId) {
      // Get payment refund details
      let paymentFilter: any = { _id: paymentId }
      
      // Apply role-based filtering
      if (session.user.role === 'patient') {
        paymentFilter.patientId = session.user.id
      } else if (session.user.role === 'doctor') {
        paymentFilter.doctorId = session.user.id
      } else if (session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      const payment = await Payment.findOne(paymentFilter)
        .populate('appointmentId', 'status appointmentDate')
        .select('amount refundedAmount refundStatus refundHistory paymentMethod createdAt')

      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        payment: {
          id: payment._id,
          amount: payment.amount,
          refundedAmount: payment.refundedAmount || 0,
          remainingAmount: payment.amount - (payment.refundedAmount || 0),
          refundStatus: payment.refundStatus || 'none',
          paymentMethod: payment.paymentMethod,
          refundHistory: payment.refundHistory || [],
          canRefund: (payment.refundStatus !== 'completed') && 
                     (['admin', 'doctor'].includes(session.user.role))
        }
      })
    }

    // Get refund statistics (admin only)
    if (session.user.role === 'admin') {
      const refundStats = await Payment.aggregate([
        {
          $match: {
            refundStatus: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$refundStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$refundedAmount' }
          }
        }
      ])

      return NextResponse.json({
        success: true,
        refundStatistics: refundStats
      })
    }

    return NextResponse.json(
      { error: 'Payment ID is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching refund details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}