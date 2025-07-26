import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import Referral from '../../../../server/models/Referral'
import Appointment from '../../../../server/models/Appointment'

// POST /api/referrals/validate - Validate referral code
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
    const { code, orderAmount } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      )
    }

    if (!orderAmount || orderAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid order amount is required' },
        { status: 400 }
      )
    }

    // Find referral code
    const referral = await Referral.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      expirationDate: { $gte: new Date() }
    }).populate('agentId', 'profile.name profile.phone')

    if (!referral) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired referral code',
        valid: false
      }, { status: 400 })
    }

    // Check if referral is valid
    if (!referral.isValid()) {
      return NextResponse.json({
        success: false,
        error: 'Referral code is no longer valid',
        valid: false,
        reason: 'expired_or_inactive'
      }, { status: 400 })
    }

    // Check usage limits
    if (referral.maxUsage && referral.usageCount >= referral.maxUsage) {
      return NextResponse.json({
        success: false,
        error: 'Referral code usage limit exceeded',
        valid: false,
        reason: 'usage_limit_exceeded'
      }, { status: 400 })
    }

    // Check minimum order amount
    if (orderAmount < referral.minOrderAmount) {
      return NextResponse.json({
        success: false,
        error: `Minimum order amount of ₹${referral.minOrderAmount} required`,
        valid: false,
        reason: 'minimum_amount_not_met',
        minimumAmount: referral.minOrderAmount
      }, { status: 400 })
    }

    // Check user-specific usage limits if logged in
    if (session.user.role === 'patient') {
      const userUsageCount = await Appointment.countDocuments({
        patientId: session.user.id,
        referralCode: code.toUpperCase(),
        status: { $ne: 'cancelled' }
      })

      if (userUsageCount >= referral.maxUsagePerUser) {
        return NextResponse.json({
          success: false,
          error: `You have already used this referral code ${referral.maxUsagePerUser} time(s)`,
          valid: false,
          reason: 'user_usage_limit_exceeded'
        }, { status: 400 })
      }
    }

    // Check target user roles
    if (referral.targetUserRoles && referral.targetUserRoles.length > 0) {
      if (!referral.targetUserRoles.includes(session.user.role as any)) {
        return NextResponse.json({
          success: false,
          error: 'This referral code is not applicable for your user type',
          valid: false,
          reason: 'invalid_user_role'
        }, { status: 400 })
      }
    }

    // Calculate discount and commission
    const discount = referral.calculateDiscount(orderAmount)
    const finalAmount = orderAmount - discount
    const commission = referral.calculateCommission(finalAmount)

    // Calculate savings percentage
    const savingsPercentage = orderAmount > 0 ? ((discount / orderAmount) * 100) : 0

    return NextResponse.json({
      success: true,
      valid: true,
      referralCode: {
        code: referral.code,
        description: referral.description,
        discountType: referral.discountType,
        discountValue: referral.discountValue,
        maxDiscountAmount: referral.maxDiscountAmount,
        minOrderAmount: referral.minOrderAmount,
        usageCount: referral.usageCount,
        maxUsage: referral.maxUsage,
        maxUsagePerUser: referral.maxUsagePerUser,
        expirationDate: referral.expirationDate,
        agent: {
          id: referral.agentId._id,
          name: referral.agentId.profile?.name,
          phone: referral.agentId.profile?.phone
        }
      },
      pricing: {
        originalAmount: orderAmount,
        discount: discount,
        finalAmount: finalAmount,
        savings: discount,
        savingsPercentage: Math.round(savingsPercentage * 100) / 100,
        commission: commission
      },
      usageInfo: {
        currentUsage: referral.usageCount,
        maxUsage: referral.maxUsage,
        remainingUsage: referral.maxUsage ? referral.maxUsage - referral.usageCount : null,
        userCanUse: true
      }
    })

  } catch (error) {
    console.error('Error validating referral code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/referrals/validate?code=XXX&amount=XXX - Quick validation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const orderAmount = parseFloat(searchParams.get('amount') || '0')

    if (!code) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find referral code
    const referral = await Referral.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      expirationDate: { $gte: new Date() }
    })

    if (!referral || !referral.isValid()) {
      return NextResponse.json({
        success: false,
        valid: false,
        exists: !!referral
      })
    }

    // Basic validation without user-specific checks
    const isValidForAmount = orderAmount >= referral.minOrderAmount
    const hasUsageRemaining = !referral.maxUsage || referral.usageCount < referral.maxUsage

    return NextResponse.json({
      success: true,
      valid: isValidForAmount && hasUsageRemaining,
      exists: true,
      basicInfo: {
        code: referral.code,
        discountType: referral.discountType,
        discountValue: referral.discountValue,
        minOrderAmount: referral.minOrderAmount,
        expirationDate: referral.expirationDate
      }
    })

  } catch (error) {
    console.error('Error in quick referral validation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}