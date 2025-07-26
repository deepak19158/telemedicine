import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import User from '../../../../../server/models/User'
import Referral from '../../../../../server/models/Referral'

// GET /api/admin/agents/codes - Get all referral codes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status') || 'all'

    // Build filter
    const filter: any = {}
    if (agentId) filter.agentId = agentId
    if (status !== 'all') {
      filter.isActive = status === 'active'
    }

    // Get referral codes with agent info
    const referralCodes = await Referral.find(filter)
      .populate('agentId', 'profile.name email')
      .populate('assignedBy', 'profile.name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const totalCodes = await Referral.countDocuments(filter)

    return NextResponse.json({
      success: true,
      data: {
        codes: referralCodes,
        pagination: {
          current: page,
          pages: Math.ceil(totalCodes / limit),
          total: totalCodes
        }
      }
    })

  } catch (error) {
    console.error('Error fetching referral codes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/agents/codes - Assign new referral code to agent
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
    const {
      agentId,
      code,
      discountType,
      discountValue,
      maxUsage,
      expirationDate
    } = body

    // Validate required fields
    if (!agentId || !code || !discountType || !discountValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate agent exists and is active
    const agent = await User.findOne({ _id: agentId, role: 'agent' })
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Check if code already exists
    const existingCode = await Referral.findOne({ code })
    if (existingCode) {
      return NextResponse.json(
        { error: 'Referral code already exists' },
        { status: 400 }
      )
    }

    // Validate discount type and value
    if (!['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json(
        { error: 'Invalid discount type. Must be percentage or fixed' },
        { status: 400 }
      )
    }

    if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Generate unique code if not provided
    let finalCode = code
    if (!finalCode) {
      finalCode = generateReferralCode(agent.profile.name)
    }

    // Create referral code
    const referralCode = new Referral({
      agentId,
      code: finalCode.toUpperCase(),
      discountType,
      discountValue,
      usageCount: 0,
      maxUsage: maxUsage || 1000, // Default max usage
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      isActive: true,
      assignedBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await referralCode.save()

    // Populate the response
    await referralCode.populate('agentId', 'profile.name email')
    await referralCode.populate('assignedBy', 'profile.name email')

    return NextResponse.json({
      success: true,
      data: { referralCode },
      message: `Referral code ${finalCode} assigned successfully`
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating referral code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate referral code
function generateReferralCode(agentName: string): string {
  const prefix = agentName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 3)
  
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${suffix}`
}