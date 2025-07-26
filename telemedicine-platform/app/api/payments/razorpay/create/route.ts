import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import Appointment from '../../../../../server/models/Appointment'
import Payment from '../../../../../server/models/Payment'
import Razorpay from 'razorpay'

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// POST /api/payments/razorpay/create - Create Razorpay order
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
    const { appointmentId, amount, currency = 'INR' } = body

    if (!appointmentId || !amount) {
      return NextResponse.json(
        { error: 'Appointment ID and amount are required' },
        { status: 400 }
      )
    }

    // Verify the appointment exists and belongs to the user
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: session.user.id
    }).populate('doctorId', 'profile.name profile.specialization')

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
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

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `apt_${appointmentId}_${Date.now()}`,
      notes: {
        appointmentId: appointmentId.toString(),
        patientId: session.user.id,
        doctorId: appointment.doctorId._id.toString(),
        doctorName: appointment.doctorId.profile?.name || 'Doctor'
      }
    })

    // Create payment record in database
    const payment = new Payment({
      appointmentId,
      patientId: session.user.id,
      doctorId: appointment.doctorId._id,
      amount: amount,
      finalAmount: amount,
      currency,
      paymentMethod: 'razorpay',
      gatewayOrderId: razorpayOrder.id,
      gatewayName: 'razorpay',
      status: 'pending',
      referralCode: appointment.referralCode,
      discount: appointment.discount || 0,
      agentCommission: appointment.agentCommission || 0,
      metadata: {
        razorpayOrderId: razorpayOrder.id,
        receipt: razorpayOrder.receipt
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await payment.save()

    // Update appointment payment status
    appointment.paymentStatus = 'pending'
    appointment.paymentMethod = 'razorpay'
    await appointment.save()

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      paymentId: payment._id,
      appointmentDetails: {
        id: appointment._id,
        doctorName: appointment.doctorId.profile?.name,
        specialization: appointment.doctorId.profile?.specialization,
        appointmentDate: appointment.appointmentDate,
        consultationType: appointment.consultationType
      },
      razorpayConfig: {
        key: process.env.RAZORPAY_KEY_ID,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Telemedicine Platform',
        description: `Consultation with ${appointment.doctorId.profile?.name}`,
        prefill: {
          name: session.user.name,
          email: session.user.email,
          contact: session.user.phone || ''
        },
        theme: {
          color: '#2563EB'
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}