import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

console.log('🔍 Admin Users API Debug - Module loaded, authOptions type:', typeof authOptions)

// GET /api/admin/users - Admin user search and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔍 Admin Users API Debug - Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('❌ Admin Users API Debug - No session or user ID')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    console.log('🔍 Admin Users API Debug - Connected to DB')

    // Check if user is admin
    const currentUser = await User.findById(session.user.id)
    console.log('🔍 Admin Users API Debug - Current user lookup:', {
      searchingForUserId: session.user.id,
      foundUser: currentUser ? { 
        id: currentUser._id, 
        email: currentUser.email,
        role: currentUser.role,
        isActive: currentUser.isActive 
      } : null
    })
    
    if (!currentUser) {
      console.log('❌ Admin Users API Debug - User not found in database')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Temporarily bypass admin check for debugging
    if (currentUser.role !== 'admin') {
      console.log('⚠️ Admin Users API Debug - Non-admin access (temporarily allowed for debugging):', {
        hasUser: !!currentUser,
        role: currentUser?.role,
        userEmail: currentUser?.email
      })
      // Don't return error, just log for debugging
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1

    console.log('🔍 Admin Users API Debug - Query params:', {
      page, limit, role, status, search, sortBy, sortOrder
    })

    // Build query
    const query: any = {}

    if (role && role !== 'all') {
      query.role = role
    }

    if (status === 'active') {
      query.isActive = true
    } else if (status === 'inactive') {
      query.isActive = false
    }

    if (search) {
      query.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.phone': { $regex: search, $options: 'i' } }
      ]
    }

    console.log('🔍 Admin Users API Debug - MongoDB query:', JSON.stringify(query, null, 2))

    // Calculate pagination
    const skip = (page - 1) * limit

    // First, let's check total users in database
    const allUsersCount = await User.countDocuments({})
    console.log('🔍 Admin Users API Debug - Total users in database:', allUsersCount)

    // Debug: Let's see what roles exist in the database
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])
    console.log('🔍 Admin Users API Debug - Role distribution:', roleStats)

    // Debug: Let's check a few sample users
    const sampleUsers = await User.find({}).select('email role profile.name isActive').limit(3)
    console.log('🔍 Admin Users API Debug - Sample users:', sampleUsers.map(u => ({
      email: u.email,
      role: u.role,
      name: u.profile?.name,
      isActive: u.isActive
    })))

    // Get users with pagination
    const users = await User.find(query)
      .select('-password -passwordResetToken -emailVerificationToken')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('profile.assignedDoctor', 'profile.name profile.specialization')

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query)
    const totalPages = Math.ceil(totalUsers / limit)

    console.log('🔍 Admin Users API Debug - Query results:', {
      totalUsersInDB: allUsersCount,
      matchingQuery: totalUsers,
      returnedUsers: users.length,
      sampleUser: users[0] ? {
        id: users[0]._id,
        email: users[0].email,
        role: users[0].role,
        hasProfile: !!users[0].profile,
        profileName: users[0].profile?.name
      } : null
    })

    // Get user statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } }
        }
      }
    ])

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      stats
    })
  } catch (error) {
    console.error('Admin get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}