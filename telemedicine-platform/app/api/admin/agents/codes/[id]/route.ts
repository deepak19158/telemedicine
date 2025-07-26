import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../lib/auth'
import connectDB from '../../../../../../lib/db'
import Referral from '../../../../../../server/models/Referral'

// GET /api/admin/agents/codes/[id] - Get specific referral code
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const referralCode = await Referral.findById(params.id)
      .populate('agentId', 'profile.name email')
      .populate('assignedBy', 'profile.name email')

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { referralCode }
    })

  } catch (error) {
    console.error('Error fetching referral code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/agents/codes/[id] - Update referral code settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      discountType,
      discountValue,
      maxUsage,
      expirationDate,
      isActive
    } = body

    // Find the referral code
    const referralCode = await Referral.findById(params.id)
    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 404 }
      )
    }

    // Validate updates
    const updates: any = { updatedAt: new Date() }

    if (discountType !== undefined) {
      if (!['percentage', 'fixed'].includes(discountType)) {
        return NextResponse.json(
          { error: 'Invalid discount type' },
          { status: 400 }
        )
      }
      updates.discountType = discountType
    }

    if (discountValue !== undefined) {
      if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
        return NextResponse.json(
          { error: 'Percentage discount must be between 1 and 100' },
          { status: 400 }
        )
      }
      updates.discountValue = discountValue
    }

    if (maxUsage !== undefined) {
      if (maxUsage < referralCode.usageCount) {
        return NextResponse.json(
          { error: 'Max usage cannot be less than current usage count' },
          { status: 400 }
        )
      }
      updates.maxUsage = maxUsage
    }

    if (expirationDate !== undefined) {
      updates.expirationDate = expirationDate ? new Date(expirationDate) : null
    }

    if (isActive !== undefined) {
      updates.isActive = isActive
    }

    // Update the referral code
    const updatedReferralCode = await Referral.findByIdAndUpdate(
      params.id,
      updates,
      { new: true }
    )
    .populate('agentId', 'profile.name email')
    .populate('assignedBy', 'profile.name email')

    return NextResponse.json({
      success: true,
      data: { referralCode: updatedReferralCode },
      message: 'Referral code updated successfully'
    })

  } catch (error) {
    console.error('Error updating referral code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/agents/codes/[id] - Delete referral code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const referralCode = await Referral.findById(params.id)
    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 404 }
      )
    }

    // Check if code has been used
    if (referralCode.usageCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete referral code that has been used. Deactivate instead.' },
        { status: 400 }
      )
    }

    await Referral.findByIdAndDelete(params.id)

    return NextResponse.json({
      success: true,
      message: 'Referral code deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting referral code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}