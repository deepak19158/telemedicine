import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import Appointment from '../../../../../server/models/Appointment'
import Payment from '../../../../../server/models/Payment'
import Referral from '../../../../../server/models/Referral'
import User from '../../../../../server/models/User'
import crypto from 'crypto'
import { 
  sendPaymentConfirmation, 
  sendAppointmentConfirmation,
  scheduleAppointmentReminder,
  sendReferralRewardNotification 
} from '../../../../../lib/notification-helper'

// POST /api/payments/razorpay/verify - Verify Razorpay payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      paymentId 
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required payment verification data' },
        { status: 400 }
      )
    }

    // Verify payment signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // Find the payment record
    const payment = await Payment.findOne({
      _id: paymentId,
      patientId: session.user.id,
      gatewayOrderId: razorpay_order_id,
      status: 'pending'
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Find the appointment
    const appointment = await Appointment.findById(payment.appointmentId)
      .populate('doctorId', 'profile.name profile.specialization')
      .populate('patientId', 'profile.name email profile.phone')

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Update payment record
    payment.gatewayPaymentId = razorpay_payment_id
    payment.gatewaySignature = razorpay_signature
    payment.status = 'completed'
    payment.completedAt = new Date()
    payment.metadata = {
      ...payment.metadata,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      verifiedAt: new Date()
    }
    payment.updatedAt = new Date()

    await payment.save()

    // Update appointment status
    appointment.paymentStatus = 'completed'
    appointment.status = 'confirmed' // Automatically confirm appointment on successful payment
    appointment.updatedAt = new Date()
    
    await appointment.save()

    // Update referral statistics if referral code was used
    if (appointment.referralCode && appointment.agentCommission > 0) {
      await Referral.findOneAndUpdate(
        { code: appointment.referralCode },
        {
          $inc: { 
            successfulReferrals: 1,
            totalCommissionEarned: appointment.agentCommission
          },
          $set: { lastUsedAt: new Date() }
        }
      )
    }

    // Prepare success response
    const response = {
      success: true,
      message: 'Payment verified successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        completedAt: payment.completedAt,
        gatewayPaymentId: razorpay_payment_id
      },
      appointment: {
        id: appointment._id,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        doctorName: appointment.doctorId.profile?.name,
        appointmentDate: appointment.appointmentDate,
        consultationType: appointment.consultationType
      },
      commission: appointment.agentCommission > 0 ? {
        amount: appointment.agentCommission,
        referralCode: appointment.referralCode
      } : null
    }

    // Send notifications after successful payment verification
    try {
      // 1. Send payment confirmation
      const paymentData = {
        patientName: appointment.patientId.profile?.name || 'Patient',
        doctorName: appointment.doctorId.profile?.name || 'Doctor',
        transactionId: razorpay_payment_id,
        amount: payment.amount,
        paymentMethod: 'Razorpay',
        paidAt: payment.completedAt,
        appointmentDate: appointment.appointmentDate,
        consultationType: appointment.consultationType,
        discount: payment.discount || 0
      }

      await sendPaymentConfirmation({
        userId: session.user.id,
        type: 'both',
        priority: 'high',
        paymentData
      })

      // 2. Send appointment confirmation
      const appointmentData = {
        patientName: appointment.patientId.profile?.name || 'Patient',
        doctorName: appointment.doctorId.profile?.name || 'Doctor',
        specialization: appointment.doctorId.profile?.specialization || 'General Medicine',
        appointmentDate: appointment.appointmentDate,
        consultationType: appointment.consultationType,
        amount: payment.amount,
        referralCode: appointment.referralCode,
        appointmentId: appointment._id.toString()
      }

      await sendAppointmentConfirmation({
        userId: session.user.id,
        type: 'both',
        priority: 'high',
        appointmentData
      })

      // 3. Schedule appointment reminder for 24 hours before
      await scheduleAppointmentReminder(
        appointment.appointmentDate,
        session.user.id,
        appointmentData
      )

      // 4. Send referral reward notification to agent if applicable
      if (appointment.referralCode && appointment.agentCommission > 0) {
        const referral = await Referral.findOne({ code: appointment.referralCode })
          .populate('agentId', 'profile.name email profile.phone')

        if (referral && referral.agentId) {
          const rewardData = {
            agentName: referral.agentId.profile?.name || 'Agent',
            commissionAmount: appointment.agentCommission,
            referralCode: appointment.referralCode,
            patientName: appointment.patientId.profile?.name || 'Patient',
            appointmentAmount: payment.amount,
            commissionRate: Math.round((appointment.agentCommission / payment.amount) * 100)
          }

          await sendReferralRewardNotification({
            userId: referral.agentId._id.toString(),
            type: 'email',
            priority: 'normal',
            rewardData
          })
        }
      }

      console.log('Payment notifications sent successfully')
    } catch (notificationError) {
      console.error('Error sending payment notifications:', notificationError)
      // Don't fail the payment verification if notifications fail
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Error verifying Razorpay payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/payments/razorpay/verify - Get payment verification status
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
    const orderId = searchParams.get('orderId')

    if (!paymentId && !orderId) {
      return NextResponse.json(
        { error: 'Payment ID or Order ID is required' },
        { status: 400 }
      )
    }

    const filter: any = { patientId: session.user.id }
    
    if (paymentId) {
      filter._id = paymentId
    } else if (orderId) {
      filter.gatewayOrderId = orderId
    }

    const payment = await Payment.findOne(filter)
      .populate('appointmentId', 'status appointmentDate consultationType')

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
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        appointment: payment.appointmentId
      }
    })

  } catch (error) {
    console.error('Error getting payment status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}