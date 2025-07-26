import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Appointment from '../../../../server/models/Appointment'
import Referral from '../../../../server/models/Referral'
import User from '../../../../server/models/User'

// GET /api/patients/appointments - Get patient's appointments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Access denied. Patient role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const patientId = session.user.id
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build filter
    const filter: any = { patientId }
    
    if (status && status !== 'all') {
      filter.status = status
    }

    // Get appointments with pagination
    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'profile.name name profile.specialization')
      .sort({ appointmentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const totalAppointments = await Appointment.countDocuments(filter)

    return NextResponse.json({
      appointments,
      pagination: {
        current: page,
        pages: Math.ceil(totalAppointments / limit),
        total: totalAppointments
      }
    })

  } catch (error) {
    console.error('Error fetching patient appointments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/patients/appointments - Create new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Access denied. Patient role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const {
      doctorId,
      appointmentDate,
      consultationType,
      reasonForVisit,
      patientNotes,
      referralCode,
      paymentMethod = 'pending'
    } = body

    // Validate required fields
    if (!doctorId || !appointmentDate || !consultationType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate doctor exists and is active
    const doctor = await User.findOne({ 
      _id: doctorId, 
      role: 'doctor', 
      isActive: true 
    }).select('profile.consultationFee profile.name profile.specialization')
    
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found or not available' },
        { status: 404 }
      )
    }

    // Get base consultation fee from doctor profile or default
    const baseConsultationFee = doctor.profile?.consultationFee || 500
    let finalFee = baseConsultationFee
    let discount = 0
    let agentCommission = 0
    let referralData = null

    // Validate and apply referral code if provided
    if (referralCode) {
      const referral = await Referral.findOne({
        code: referralCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        expirationDate: { $gte: new Date() }
      })

      if (!referral) {
        return NextResponse.json(
          { error: 'Invalid or expired referral code' },
          { status: 400 }
        )
      }

      // Check if referral can be used
      if (!referral.isValid()) {
        return NextResponse.json(
          { error: 'Referral code is no longer valid' },
          { status: 400 }
        )
      }

      // Check usage limits
      if (referral.maxUsage && referral.usageCount >= referral.maxUsage) {
        return NextResponse.json(
          { error: 'Referral code usage limit exceeded' },
          { status: 400 }
        )
      }

      // Check minimum order amount
      if (baseConsultationFee < referral.minOrderAmount) {
        return NextResponse.json(
          { error: `Minimum order amount of ₹${referral.minOrderAmount} required for this referral code` },
          { status: 400 }
        )
      }

      // Calculate discount
      discount = referral.calculateDiscount(baseConsultationFee)
      finalFee = baseConsultationFee - discount
      agentCommission = referral.calculateCommission(finalFee)
      
      referralData = {
        id: referral._id,
        code: referral.code,
        agentId: referral.agentId,
        discountType: referral.discountType,
        discountValue: referral.discountValue
      }
    }

    // Validate appointment date is in the future
    const appointmentDateTime = new Date(appointmentDate)
    if (appointmentDateTime <= new Date()) {
      return NextResponse.json(
        { error: 'Appointment date must be in the future' },
        { status: 400 }
      )
    }

    // Check for conflicting appointments for the same time slot
    const conflictingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: appointmentDateTime,
      status: { $in: ['scheduled', 'confirmed'] }
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'This time slot is already booked' },
        { status: 409 }
      )
    }

    // Create appointment
    const appointment = new Appointment({
      patientId: session.user.id,
      doctorId,
      appointmentDate: appointmentDateTime,
      consultationType,
      reasonForVisit,
      patientNotes,
      referralCode: referralCode || null,
      status: 'scheduled',
      consultationFee: baseConsultationFee,
      discount,
      finalAmount: finalFee,
      agentCommission,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_via_agent' ? 'pending' : 'pending',
      referralDetails: referralData,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await appointment.save()
    
    // Update referral usage if referral code was used
    if (referralCode && referralData) {
      await Referral.findByIdAndUpdate(referralData.id, {
        $inc: { 
          usageCount: 1,
          totalReferrals: 1,
          totalDiscountGiven: discount,
          totalCommissionEarned: agentCommission
        },
        $set: { lastUsedAt: new Date() }
      })
    }
    
    // Populate the response
    await appointment.populate([
      { path: 'doctorId', select: 'profile.name profile.specialization profile.consultationFee' },
      { path: 'patientId', select: 'profile.name profile.phone' }
    ])

    return NextResponse.json({
      success: true,
      message: 'Appointment scheduled successfully',
      appointment,
      pricing: {
        baseAmount: baseConsultationFee,
        discount,
        finalAmount: finalFee,
        savings: discount > 0 ? discount : 0
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}