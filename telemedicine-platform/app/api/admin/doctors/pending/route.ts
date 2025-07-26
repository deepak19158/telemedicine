import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import connectDB from '../../../../../lib/db'
import User from '../../../../../server/models/User'

// GET /api/admin/doctors/pending - Get pending doctor approvals
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

    // Check if user is admin
    const currentUser = await User.findById(session.user.id)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1

    // Build query for pending doctors
    const query = {
      role: 'doctor',
      isActive: false,
      $or: [
        { registrationStatus: 'pending_approval' },
        { registrationStatus: { $exists: false } }
      ]
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get pending doctors
    const pendingDoctors = await User.find(query)
      .select('-password -passwordResetToken -emailVerificationToken')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)

    // Get total count
    const totalPending = await User.countDocuments(query)
    const totalPages = Math.ceil(totalPending / limit)

    // Get approval statistics
    const approvalStats = await User.aggregate([
      {
        $match: { role: 'doctor' }
      },
      {
        $group: {
          _id: null,
          totalDoctors: { $sum: 1 },
          approvedDoctors: { $sum: { $cond: ['$isActive', 1, 0] } },
          pendingDoctors: { 
            $sum: { 
              $cond: [
                { $and: [{ $eq: ['$isActive', false] }, { $ne: ['$registrationStatus', 'rejected'] }] },
                1, 
                0
              ] 
            } 
          },
          rejectedDoctors: { $sum: { $cond: [{ $eq: ['$registrationStatus', 'rejected'] }, 1, 0] } },
          avgProcessingTime: { $avg: '$createdAt' }
        }
      }
    ])

    return NextResponse.json({
      success: true,
      pendingDoctors,
      pagination: {
        currentPage: page,
        totalPages,
        totalPending,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      stats: approvalStats[0] || {
        totalDoctors: 0,
        approvedDoctors: 0,
        pendingDoctors: 0,
        rejectedDoctors: 0
      }
    })
  } catch (error) {
    console.error('Get pending doctors error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}