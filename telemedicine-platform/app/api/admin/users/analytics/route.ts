import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import connectDB from '../../../../../lib/db'
import User from '../../../../../server/models/User'

// GET /api/admin/users/analytics - User growth analytics
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
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // User registration trends
    const userTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ])

    // Overall user statistics
    const totalStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
          newThisPeriod: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startDate] },
                1,
                0
              ]
            }
          }
        }
      }
    ])

    // User verification rates
    const verificationStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          newUsersThisPeriod: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startDate] },
                1,
                0
              ]
            }
          }
        }
      }
    ])

    // Monthly user growth (last 12 months)
    const monthlyGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { 
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    // Role-specific metrics
    const roleMetrics = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
          avgRegistrationTime: { $avg: '$createdAt' },
          recentRegistrations: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ])

    // Doctor approval metrics (if applicable)
    const doctorApprovalStats = await User.aggregate([
      {
        $match: { role: 'doctor' }
      },
      {
        $group: {
          _id: null,
          totalDoctors: { $sum: 1 },
          approvedDoctors: { $sum: { $cond: ['$isActive', 1, 0] } },
          pendingApproval: { $sum: { $cond: [{ $not: '$isActive' }, 1, 0] } },
          verifiedDoctors: { $sum: { $cond: ['$isVerified', 1, 0] } }
        }
      }
    ])

    // Get user activity patterns (days of week when users register most)
    const activityPatterns = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          registrations: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ])

    return NextResponse.json({
      success: true,
      analytics: {
        userTrends,
        totalStats,
        verificationStats: verificationStats[0] || {
          totalUsers: 0,
          verifiedUsers: 0,
          activeUsers: 0,
          newUsersThisPeriod: 0
        },
        monthlyGrowth,
        roleMetrics,
        doctorApprovalStats: doctorApprovalStats[0] || {
          totalDoctors: 0,
          approvedDoctors: 0,
          pendingApproval: 0,
          verifiedDoctors: 0
        },
        activityPatterns,
        period: parseInt(period),
        generatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Admin user analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}