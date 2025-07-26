import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Appointment from '../../../../server/models/Appointment'
import Payment from '../../../../server/models/Payment'
import Referral from '../../../../server/models/Referral'
import User from '../../../../server/models/User'
import { 
  sendPaymentConfirmation, 
  sendAppointmentConfirmation,
  scheduleAppointmentReminder,
  sendReferralRewardNotification 
} from '../../../../lib/notification-helper'

// POST /api/payments/cash - Process cash payment via agent
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
    const { appointmentId, amount, agentCode, receiptNumber, notes } = body

    if (!appointmentId || !amount || !agentCode) {
      return NextResponse.json(
        { error: 'Appointment ID, amount, and agent code are required' },
        { status: 400 }
      )
    }

    // Verify the appointment exists
    let appointmentFilter: any = { _id: appointmentId }
    
    // If user is a patient, they can only pay for their own appointments
    if (session.user.role === 'patient') {
      appointmentFilter.patientId = session.user.id
    }
    // If user is an agent, they can process payments for any appointment
    else if (session.user.role !== 'agent' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only patients, agents, or admins can process cash payments' },
        { status: 403 }
      )
    }

    const appointment = await Appointment.findOne(appointmentFilter)
      .populate('doctorId', 'profile.name profile.specialization')
      .populate('patientId', 'profile.name email profile.phone')

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verify agent exists and is active
    const agent = await User.findOne({
      'profile.agentCode': agentCode,
      role: 'agent',
      isActive: true
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid agent code or agent not active' },
        { status: 400 }
      )
    }

    // Check if appointment amount matches
    const expectedAmount = appointment.finalAmount || appointment.consultationFee
    if (Math.abs(amount - expectedAmount) > 1) { // Allow 1 rupee difference for rounding
      return NextResponse.json(
        { error: 'Amount mismatch with appointment' },
        { status: 400 }
      )
    }

    // Check if payment already exists for this appointment
    const existingPayment = await Payment.findOne({
      appointmentId,
      status: { $in: ['pending', 'completed'] }
    })

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Payment already exists for this appointment' },
        { status: 409 }
      )
    }

    // Calculate agent commission (if this is the agent processing their own referral)
    let actualCommission = 0
    if (appointment.referralCode && appointment.agentCommission > 0) {
      // Verify this agent owns the referral code
      const referral = await Referral.findOne({
        code: appointment.referralCode,
        agentId: agent._id
      })
      
      if (referral) {
        actualCommission = appointment.agentCommission
      }
    }

    // Generate unique transaction ID
    const txnid = `CASH_${appointmentId}_${Date.now()}`

    // Create payment record
    const payment = new Payment({
      appointmentId,
      patientId: appointment.patientId._id,
      doctorId: appointment.doctorId._id,
      amount: amount,
      finalAmount: amount,
      currency: 'INR',
      paymentMethod: 'cash_via_agent',
      gatewayOrderId: txnid,
      gatewayName: 'cash',
      gatewayPaymentId: receiptNumber || txnid,
      status: 'completed', // Cash payments are immediately completed
      completedAt: new Date(),
      referralCode: appointment.referralCode,
      discount: appointment.discount || 0,
      agentCommission: actualCommission,
      metadata: {
        agentId: agent._id,
        agentCode: agentCode,
        agentName: agent.profile?.name,
        receiptNumber: receiptNumber,
        notes: notes,
        processedBy: session.user.id,
        cashPaymentConfirmedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await payment.save()

    // Update appointment status
    appointment.paymentStatus = 'completed'
    appointment.paymentMethod = 'cash_via_agent'
    appointment.status = 'confirmed' // Automatically confirm appointment on successful payment
    appointment.updatedAt = new Date()
    
    await appointment.save()

    // Update referral statistics if referral code was used
    if (appointment.referralCode && actualCommission > 0) {
      await Referral.findOneAndUpdate(
        { code: appointment.referralCode },
        {
          $inc: { 
            successfulReferrals: 1,
            totalCommissionEarned: actualCommission
          },
          $set: { lastUsedAt: new Date() }
        }
      )
    }

    // Send notifications after successful cash payment
    try {
      // 1. Send payment confirmation
      const paymentData = {
        patientName: appointment.patientId.profile?.name || 'Patient',
        doctorName: appointment.doctorId.profile?.name || 'Doctor',
        transactionId: receiptNumber || txnid,
        amount: amount,
        paymentMethod: 'Cash via Agent',
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
        amount: amount,
        referralCode: appointment.referralCode,
        appointmentId: appointment._id.toString()
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
      if (actualCommission > 0 && appointment.referralCode) {
        const rewardData = {
          agentName: agent.profile?.name || 'Agent',
          commissionAmount: actualCommission,
          referralCode: appointment.referralCode,
          patientName: appointment.patientId.profile?.name || 'Patient',
          appointmentAmount: amount,
          commissionRate: Math.round((actualCommission / amount) * 100)
        }

        await sendReferralRewardNotification({
          userId: agent._id.toString(),
          type: 'email',
          priority: 'normal',
          rewardData
        })
      }

      console.log('Cash payment notifications sent successfully')
    } catch (notificationError) {
      console.error('Error sending cash payment notifications:', notificationError)
      // Don't fail the payment processing if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Cash payment processed successfully',
      payment: {
        id: payment._id,
        txnid: txnid,
        amount: amount,
        status: payment.status,
        paymentMethod: 'cash_via_agent',
        completedAt: payment.completedAt,
        receiptNumber: receiptNumber || txnid
      },
      appointment: {
        id: appointment._id,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        doctorName: appointment.doctorId.profile?.name,
        patientName: appointment.patientId.profile?.name,
        appointmentDate: appointment.appointmentDate
      },
      agent: {
        id: agent._id,
        name: agent.profile?.name,
        code: agentCode,
        commission: actualCommission
      },
      commission: actualCommission > 0 ? {
        amount: actualCommission,
        referralCode: appointment.referralCode
      } : null
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing cash payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/payments/cash - Get cash payment details or validate agent
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
    const agentCode = searchParams.get('agentCode')
    const appointmentId = searchParams.get('appointmentId')

    // Validate agent code
    if (agentCode) {
      const agent = await User.findOne({
        'profile.agentCode': agentCode,
        role: 'agent',
        isActive: true
      }).select('profile.name profile.agentCode profile.commissionRate')

      if (!agent) {
        return NextResponse.json(
          { error: 'Invalid agent code or agent not active' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        agent: {
          id: agent._id,
          name: agent.profile.name,
          code: agent.profile.agentCode,
          commissionRate: agent.profile.commissionRate
        }
      })
    }

    // Get appointment details for cash payment
    if (appointmentId) {
      let appointmentFilter: any = { _id: appointmentId }
      
      if (session.user.role === 'patient') {
        appointmentFilter.patientId = session.user.id
      }

      const appointment = await Appointment.findOne(appointmentFilter)
        .populate('doctorId', 'profile.name profile.specialization')
        .populate('patientId', 'profile.name')

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        appointment: {
          id: appointment._id,
          doctorName: appointment.doctorId.profile?.name,
          patientName: appointment.patientId.profile?.name,
          amount: appointment.finalAmount || appointment.consultationFee,
          discount: appointment.discount || 0,
          referralCode: appointment.referralCode,
          agentCommission: appointment.agentCommission || 0,
          appointmentDate: appointment.appointmentDate,
          consultationType: appointment.consultationType
        }
      })
    }

    return NextResponse.json(
      { error: 'Agent code or appointment ID is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error getting cash payment details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}