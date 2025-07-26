import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'
import Referral from '../../../../server/models/Referral'

// GET /api/admin/agents - Get all agents with filtering and analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build filter query
    const filter: any = { role: 'agent' }
    
    if (search) {
      filter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (status !== 'all') {
      filter.isActive = status === 'active'
    }

    // Build sort object
    const sort: any = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    // Get agents with pagination
    const agents = await User.find(filter)
      .select('-password -passwordResetToken -emailVerificationToken')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const totalAgents = await User.countDocuments(filter)

    // Get referral statistics for each agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const referralStats = await Referral.aggregate([
          { $match: { agentId: agent._id } },
          {
            $group: {
              _id: null,
              totalCodes: { $sum: 1 },
              activeCodes: { $sum: { $cond: ['$isActive', 1, 0] } },
              totalUsage: { $sum: '$usageCount' }
            }
          }
        ])

        // Get commission data from appointments
        // This would need to be calculated from appointments with referral codes
        const stats = referralStats[0] || {
          totalCodes: 0,
          activeCodes: 0,
          totalUsage: 0
        }

        return {
          ...agent,
          stats: {
            ...stats,
            totalCommissions: 0, // Calculate from appointments
            thisMonthCommissions: 0,
            successfulReferrals: stats.totalUsage
          }
        }
      })
    )

    // Get overall agent analytics
    const totalActiveAgents = await User.countDocuments({ role: 'agent', isActive: true })
    const totalInactiveAgents = await User.countDocuments({ role: 'agent', isActive: false })
    
    const analytics = {
      totalAgents: totalAgents,
      activeAgents: totalActiveAgents,
      inactiveAgents: totalInactiveAgents,
      newAgentsThisMonth: await User.countDocuments({
        role: 'agent',
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        agents: agentsWithStats,
        analytics,
        pagination: {
          current: page,
          pages: Math.ceil(totalAgents / limit),
          total: totalAgents,
          hasNext: page < Math.ceil(totalAgents / limit),
          hasPrev: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/agents - Create new agent (if needed)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const body = await request.json()
    const { email, name, phone, address } = body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create new agent user
    const agent = new User({
      email,
      role: 'agent',
      profile: {
        name,
        phone,
        address
      },
      isActive: true,
      isVerified: true, // Admin-created agents are auto-verified
      createdAt: new Date()
    })

    await agent.save()

    return NextResponse.json({
      success: true,
      data: { agent },
      message: 'Agent created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}