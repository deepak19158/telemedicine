import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import Appointment from '../../../../../server/models/Appointment'
import Payment from '../../../../../server/models/Payment'
import crypto from 'crypto'

// Helper function to generate PayU hash
function generatePayUHash(data: any, salt: string): string {
  const hashString = `${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|||||||||||${salt}`
  return crypto.createHash('sha512').update(hashString).digest('hex')
}

// POST /api/payments/payu/create - Create PayU payment request
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
    const { appointmentId, amount, successUrl, failureUrl } = body

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
      .populate('patientId', 'profile.name email profile.phone')

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

    // Generate unique transaction ID
    const txnid = `TXN_${appointmentId}_${Date.now()}`
    
    // Prepare PayU payment data
    const payuData = {
      key: process.env.PAYU_MERCHANT_KEY!,
      txnid: txnid,
      amount: amount.toString(),
      productinfo: `Consultation with ${appointment.doctorId.profile?.name}`,
      firstname: appointment.patientId.profile?.name || session.user.name || 'Patient',
      email: appointment.patientId.email || session.user.email,
      phone: appointment.patientId.profile?.phone || '',
      surl: successUrl || `${process.env.NEXTAUTH_URL}/payment/success`,
      furl: failureUrl || `${process.env.NEXTAUTH_URL}/payment/failure`,
      service_provider: 'payu_paisa',
      udf1: appointmentId.toString(),
      udf2: session.user.id,
      udf3: appointment.doctorId._id.toString(),
      udf4: appointment.referralCode || '',
      udf5: appointment.agentCommission?.toString() || '0'
    }

    // Generate hash
    const hash = generatePayUHash(payuData, process.env.PAYU_MERCHANT_SALT!)

    // Create payment record in database
    const payment = new Payment({
      appointmentId,
      patientId: session.user.id,
      doctorId: appointment.doctorId._id,
      amount: amount,
      finalAmount: amount,
      currency: 'INR',
      paymentMethod: 'payu',
      gatewayOrderId: txnid,
      gatewayName: 'payu',
      status: 'pending',
      referralCode: appointment.referralCode,
      discount: appointment.discount || 0,
      agentCommission: appointment.agentCommission || 0,
      metadata: {
        payuTxnId: txnid,
        payuKey: payuData.key,
        payuHash: hash
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await payment.save()

    // Update appointment payment status
    appointment.paymentStatus = 'pending'
    appointment.paymentMethod = 'payu'
    await appointment.save()

    return NextResponse.json({
      success: true,
      paymentId: payment._id,
      txnid: txnid,
      appointmentDetails: {
        id: appointment._id,
        doctorName: appointment.doctorId.profile?.name,
        specialization: appointment.doctorId.profile?.specialization,
        appointmentDate: appointment.appointmentDate,
        consultationType: appointment.consultationType
      },
      payuConfig: {
        ...payuData,
        hash: hash,
        action: process.env.NODE_ENV === 'production' 
          ? 'https://secure.payu.in/_payment'
          : 'https://test.payu.in/_payment'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating PayU payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/payments/payu/create - Get PayU configuration for client-side
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Get appointment details
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: session.user.id
    }).populate('doctorId', 'profile.name')

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      config: {
        merchantKey: process.env.PAYU_MERCHANT_KEY,
        actionUrl: process.env.NODE_ENV === 'production' 
          ? 'https://secure.payu.in/_payment'
          : 'https://test.payu.in/_payment',
        amount: appointment.finalAmount || appointment.consultationFee,
        productInfo: `Consultation with ${appointment.doctorId.profile?.name}`,
        customerInfo: {
          name: session.user.name,
          email: session.user.email,
          phone: session.user.phone || ''
        }
      }
    })

  } catch (error) {
    console.error('Error getting PayU config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}