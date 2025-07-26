import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// GET /api/users/profile - Get user profile data
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
    
    const user = await User.findById(session.user.id)
      .select('-password -passwordResetToken -emailVerificationToken')
      .populate('profile.assignedDoctor', 'profile.name profile.specialization')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate user stats for dashboard
    const stats = {
      upcomingAppointments: 0, // Will be populated later
      medicalRecords: 0,
      totalConsultations: 0,
      pendingReviews: 0
    }

    // Create response with proper structure for useApi hook
    return NextResponse.json({
      success: true,
      data: {
        profile: user,
        stats,
        recentActivity: [] // Will be populated with real data later
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/profile - Update user profile information
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
    
    const body = await request.json()
    const { 
      name, 
      phone, 
      address,
      specialization,
      licenseNumber
    } = body

    // Find the user
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update object
    const updateData: any = {}

    // Basic profile fields
    if (name) updateData['profile.name'] = name.trim()
    if (phone) updateData['profile.phone'] = phone.trim()
    
    // Address fields
    if (address) {
      if (address.street) updateData['profile.address.street'] = address.street.trim()
      if (address.city) updateData['profile.address.city'] = address.city.trim()
      if (address.state) updateData['profile.address.state'] = address.state.trim()
      if (address.zipCode) updateData['profile.address.zipCode'] = address.zipCode.trim()
      if (address.country) updateData['profile.address.country'] = address.country.trim()
    }

    // Doctor-specific fields
    if (user.role === 'doctor') {
      if (specialization) updateData['profile.specialization'] = specialization.trim()
      if (licenseNumber) updateData['profile.licenseNumber'] = licenseNumber.trim()
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true,
        select: '-password -passwordResetToken -emailVerificationToken'
      }
    ).populate('profile.assignedDoctor', 'profile.name profile.specialization')

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: updatedUser
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    
    // Handle validation errors
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