import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// GET /api/doctors/profile - Get doctor profile
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

    const doctor = await User.findById(session.user.id)
      .select('-password -passwordResetToken -emailVerificationToken')

    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    // Get doctor's statistics
    const Appointment = require('../../../../server/models/Appointment')
    const appointmentStats = await Appointment.aggregate([
      {
        $match: { doctorId: doctor._id }
      },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          completedAppointments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          upcomingAppointments: { $sum: { $cond: [{ $in: ['$status', ['scheduled', 'confirmed']] }, 1, 0] } },
          totalEarnings: { $sum: '$consultationFee' },
          avgRating: { $avg: '$rating' }
        }
      }
    ])

    const stats = appointmentStats[0] || {
      totalAppointments: 0,
      completedAppointments: 0,
      upcomingAppointments: 0,
      totalEarnings: 0,
      avgRating: 0
    }

    return NextResponse.json({
      success: true,
      doctor,
      stats
    })
  } catch (error) {
    console.error('Get doctor profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/doctors/profile - Update doctor profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    const doctor = await User.findById(session.user.id)
    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      phone,
      about,
      consultationFee,
      specialization,
      hospitalAffiliation,
      experience,
      address,
      availability,
      acceptingNewPatients
    } = body

    // Prepare update object
    const updateData: any = {}

    // Basic profile updates
    if (name) updateData['profile.name'] = name.trim()
    if (phone) updateData['profile.phone'] = phone.trim()
    if (about) updateData['profile.about'] = about.trim()
    if (hospitalAffiliation) updateData['profile.hospitalAffiliation'] = hospitalAffiliation.trim()
    
    // Numeric fields
    if (consultationFee !== undefined) {
      const fee = parseFloat(consultationFee)
      if (fee < 0 || fee > 10000) {
        return NextResponse.json(
          { error: 'Consultation fee must be between 0 and 10000' },
          { status: 400 }
        )
      }
      updateData['profile.consultationFee'] = fee
    }

    if (experience !== undefined) {
      const exp = parseInt(experience)
      if (exp < 0 || exp > 50) {
        return NextResponse.json(
          { error: 'Experience must be between 0 and 50 years' },
          { status: 400 }
        )
      }
      updateData['profile.experience'] = exp
    }

    // Specialization (validate against allowed list)
    if (specialization) {
      const validSpecializations = [
        'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics',
        'Neurology', 'Psychiatry', 'Oncology', 'Gynecology', 'Ophthalmology',
        'ENT', 'Emergency Medicine', 'Internal Medicine', 'Family Medicine',
        'Radiology', 'Anesthesiology', 'Pathology', 'Surgery', 'Urology', 'Endocrinology'
      ]

      if (!validSpecializations.includes(specialization)) {
        return NextResponse.json(
          { error: 'Invalid specialization' },
          { status: 400 }
        )
      }
      updateData['profile.specialization'] = specialization
    }

    // Address updates
    if (address) {
      if (address.street) updateData['profile.address.street'] = address.street.trim()
      if (address.city) updateData['profile.address.city'] = address.city.trim()
      if (address.state) updateData['profile.address.state'] = address.state.trim()
      if (address.zipCode) updateData['profile.address.zipCode'] = address.zipCode.trim()
      if (address.country) updateData['profile.address.country'] = address.country.trim()
    }

    // Availability and patient acceptance
    if (availability !== undefined) updateData['profile.availability'] = availability
    if (acceptingNewPatients !== undefined) updateData['profile.acceptingNewPatients'] = acceptingNewPatients

    // Update the doctor
    const updatedDoctor = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { 
        new: true,
        runValidators: true,
        select: '-password -passwordResetToken -emailVerificationToken'
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      doctor: updatedDoctor
    })
  } catch (error) {
    console.error('Update doctor profile error:', error)
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}