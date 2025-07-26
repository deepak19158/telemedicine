import { NextRequest, NextResponse } from 'next/server'
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

// Helper function to verify PayU hash
function verifyPayUHash(response: any, salt: string): boolean {
  const reverseHashString = `${salt}|${response.status}||||||||||${response.udf5}|${response.udf4}|${response.udf3}|${response.udf2}|${response.udf1}|${response.email}|${response.firstname}|${response.productinfo}|${response.amount}|${response.txnid}|${response.key}`
  const expectedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex')
  return expectedHash === response.hash
}

// POST /api/payments/payu/response - Handle PayU payment response
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash,
      payuMoneyId,
      mihpayid,
      udf1: appointmentId,
      udf2: patientId,
      udf3: doctorId,
      udf4: referralCode,
      udf5: agentCommission,
      error,
      error_Message
    } = body

    console.log('PayU Response received:', { txnid, status, appointmentId, amount })

    // Verify hash
    if (!verifyPayUHash(body, process.env.PAYU_MERCHANT_SALT!)) {
      console.error('PayU hash verification failed')
      return NextResponse.json(
        { error: 'Invalid payment response hash' },
        { status: 400 }
      )
    }

    // Find the payment record
    const payment = await Payment.findOne({
      gatewayOrderId: txnid,
      appointmentId: appointmentId,
      status: 'pending'
    })

    if (!payment) {
      console.error('Payment record not found for txnid:', txnid)
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'profile.name profile.specialization')
      .populate('patientId', 'profile.name email profile.phone')

    if (!appointment) {
      console.error('Appointment not found:', appointmentId)
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Update payment based on status
    if (status === 'success') {
      // Payment successful
      payment.gatewayPaymentId = mihpayid || payuMoneyId
      payment.status = 'completed'
      payment.completedAt = new Date()
      payment.metadata = {
        ...payment.metadata,
        payuStatus: status,
        payuPaymentId: mihpayid,
        payuMoneyId: payuMoneyId,
        verifiedAt: new Date()
      }

      // Update appointment status
      appointment.paymentStatus = 'completed'
      appointment.status = 'confirmed' // Automatically confirm appointment on successful payment
      appointment.updatedAt = new Date()

      // Update referral statistics if referral code was used
      if (referralCode && parseFloat(agentCommission) > 0) {
        await Referral.findOneAndUpdate(
          { code: referralCode },
          {
            $inc: { 
              successfulReferrals: 1,
              totalCommissionEarned: parseFloat(agentCommission)
            },
            $set: { lastUsedAt: new Date() }
          }
        )
      }

      console.log('Payment successful for txnid:', txnid)

      // Send notifications after successful payment
      try {
        // 1. Send payment confirmation
        const paymentData = {
          patientName: appointment.patientId.profile?.name || 'Patient',
          doctorName: appointment.doctorId.profile?.name || 'Doctor',
          transactionId: mihpayid || payuMoneyId || txnid,
          amount: parseFloat(amount),
          paymentMethod: 'PayU',
          paidAt: payment.completedAt,
          appointmentDate: appointment.appointmentDate,
          consultationType: appointment.consultationType,
          discount: payment.discount || 0
        }

        await sendPaymentConfirmation({
          userId: appointment.patientId._id.toString(),
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
          amount: parseFloat(amount),
          referralCode: referralCode,
          appointmentId: appointmentId
        }

        await sendAppointmentConfirmation({
          userId: appointment.patientId._id.toString(),
          type: 'both',
          priority: 'high',
          appointmentData
        })

        // 3. Schedule appointment reminder for 24 hours before
        await scheduleAppointmentReminder(
          appointment.appointmentDate,
          appointment.patientId._id.toString(),
          appointmentData
        )

        // 4. Send referral reward notification to agent if applicable
        if (referralCode && parseFloat(agentCommission) > 0) {
          const referral = await Referral.findOne({ code: referralCode })
            .populate('agentId', 'profile.name email profile.phone')

          if (referral && referral.agentId) {
            const rewardData = {
              agentName: referral.agentId.profile?.name || 'Agent',
              commissionAmount: parseFloat(agentCommission),
              referralCode: referralCode,
              patientName: appointment.patientId.profile?.name || 'Patient',
              appointmentAmount: parseFloat(amount),
              commissionRate: Math.round((parseFloat(agentCommission) / parseFloat(amount)) * 100)
            }

            await sendReferralRewardNotification({
              userId: referral.agentId._id.toString(),
              type: 'email',
              priority: 'normal',
              rewardData
            })
          }
        }

        console.log('PayU payment notifications sent successfully')
      } catch (notificationError) {
        console.error('Error sending PayU payment notifications:', notificationError)
        // Don't fail the payment processing if notifications fail
      }

    } else if (status === 'failure') {
      // Payment failed
      payment.status = 'failed'
      payment.failureReason = error_Message || error || 'Payment failed'
      payment.metadata = {
        ...payment.metadata,
        payuStatus: status,
        payuError: error,
        payuErrorMessage: error_Message,
        failedAt: new Date()
      }

      // Update appointment status
      appointment.paymentStatus = 'failed'
      appointment.updatedAt = new Date()

      console.log('Payment failed for txnid:', txnid, 'Error:', error_Message)

    } else {
      // Unknown status
      payment.status = 'pending'
      payment.metadata = {
        ...payment.metadata,
        payuStatus: status,
        unknownStatusAt: new Date()
      }

      console.log('Unknown payment status for txnid:', txnid, 'Status:', status)
    }

    payment.updatedAt = new Date()
    await payment.save()
    await appointment.save()

    // Prepare response
    const response = {
      success: status === 'success',
      status: status,
      message: status === 'success' 
        ? 'Payment completed successfully' 
        : status === 'failure' 
          ? `Payment failed: ${error_Message || error}`
          : 'Payment status unknown',
      payment: {
        id: payment._id,
        txnid: txnid,
        amount: parseFloat(amount),
        status: payment.status,
        paymentMethod: 'payu',
        completedAt: payment.completedAt,
        gatewayPaymentId: payment.gatewayPaymentId
      },
      appointment: {
        id: appointment._id,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        doctorName: appointment.doctorId.profile?.name,
        appointmentDate: appointment.appointmentDate
      }
    }

    // TODO: Send confirmation email and SMS notifications here
    // This will be implemented in the notification system

    return NextResponse.json(response, { 
      status: status === 'success' ? 200 : 400 
    })

  } catch (error) {
    console.error('Error processing PayU response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/payments/payu/response - Handle PayU GET response (for success/failure redirects)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const txnid = searchParams.get('txnid')
    const status = searchParams.get('status')
    
    if (!txnid) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/payment/error?error=missing_txnid`)
    }

    await connectDB()

    // Find payment record
    const payment = await Payment.findOne({
      gatewayOrderId: txnid
    }).populate('appointmentId', 'status appointmentDate')

    if (!payment) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/payment/error?error=payment_not_found`)
    }

    // Redirect based on payment status
    if (payment.status === 'completed') {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/payment/success?paymentId=${payment._id}&appointmentId=${payment.appointmentId._id}`
      )
    } else if (payment.status === 'failed') {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/payment/failure?paymentId=${payment._id}&reason=${encodeURIComponent(payment.failureReason || 'Payment failed')}`
      )
    } else {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/payment/pending?paymentId=${payment._id}`
      )
    }

  } catch (error) {
    console.error('Error handling PayU GET response:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/payment/error?error=server_error`)
  }
}