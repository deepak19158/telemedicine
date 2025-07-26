import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// GET /api/doctors/search - Doctor search with filters
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    
    // Search parameters
    const search = searchParams.get('search')
    const specialization = searchParams.get('specialization')
    const minFee = searchParams.get('minFee')
    const maxFee = searchParams.get('maxFee')
    const minExperience = searchParams.get('minExperience')
    const acceptingPatients = searchParams.get('acceptingPatients')
    const sortBy = searchParams.get('sortBy') || 'experience'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    // Build query
    const query: any = {
      role: 'doctor',
      isActive: true,
      isVerified: true,
      registrationStatus: 'approved'
    }

    // Text search in name, specialization, about
    if (search) {
      query.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { 'profile.specialization': { $regex: search, $options: 'i' } },
        { 'profile.about': { $regex: search, $options: 'i' } },
        { 'profile.hospitalAffiliation': { $regex: search, $options: 'i' } }
      ]
    }

    // Specialization filter
    if (specialization && specialization !== 'all') {
      query['profile.specialization'] = specialization
    }

    // Fee range filter
    if (minFee || maxFee) {
      query['profile.consultationFee'] = {}
      if (minFee) query['profile.consultationFee'].$gte = parseFloat(minFee)
      if (maxFee) query['profile.consultationFee'].$lte = parseFloat(maxFee)
    }

    // Experience filter
    if (minExperience) {
      query['profile.experience'] = { $gte: parseInt(minExperience) }
    }

    // Accepting new patients filter
    if (acceptingPatients === 'true') {
      query['profile.acceptingNewPatients'] = true
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build sort object
    let sortObj: any = {}
    switch (sortBy) {
      case 'name':
        sortObj = { 'profile.name': sortOrder }
        break
      case 'experience':
        sortObj = { 'profile.experience': sortOrder }
        break
      case 'fee':
        sortObj = { 'profile.consultationFee': sortOrder }
        break
      case 'rating':
        sortObj = { 'profile.rating': sortOrder }
        break
      default:
        sortObj = { 'profile.experience': -1 }
    }

    // Execute search with aggregation for enhanced data
    const doctors = await User.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'doctorId',
          as: 'appointments'
        }
      },
      {
        $addFields: {
          totalAppointments: { $size: '$appointments' },
          completedAppointments: {
            $size: {
              $filter: {
                input: '$appointments',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          },
          avgRating: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: '$appointments',
                    cond: { $ne: ['$$this.rating', null] }
                  }
                },
                in: '$$this.rating'
              }
            }
          }
        }
      },
      {
        $project: {
          password: 0,
          passwordResetToken: 0,
          emailVerificationToken: 0,
          appointments: 0
        }
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit }
    ])

    // Get total count for pagination
    const totalDoctors = await User.countDocuments(query)
    const totalPages = Math.ceil(totalDoctors / limit)

    // Get filter statistics
    const filterStats = await User.aggregate([
      { $match: { role: 'doctor', isActive: true, isVerified: true, registrationStatus: 'approved' } },
      {
        $group: {
          _id: null,
          specializations: { $addToSet: '$profile.specialization' },
          minFee: { $min: '$profile.consultationFee' },
          maxFee: { $max: '$profile.consultationFee' },
          avgFee: { $avg: '$profile.consultationFee' },
          minExperience: { $min: '$profile.experience' },
          maxExperience: { $max: '$profile.experience' },
          acceptingPatientsCount: {
            $sum: { $cond: ['$profile.acceptingNewPatients', 1, 0] }
          },
          totalCount: { $sum: 1 }
        }
      }
    ])

    const stats = filterStats[0] || {
      specializations: [],
      minFee: 0,
      maxFee: 1000,
      avgFee: 0,
      minExperience: 0,
      maxExperience: 30,
      acceptingPatientsCount: 0,
      totalCount: 0
    }

    return NextResponse.json({
      success: true,
      doctors,
      pagination: {
        currentPage: page,
        totalPages,
        totalDoctors,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      },
      filters: {
        appliedFilters: {
          search,
          specialization,
          minFee,
          maxFee,
          minExperience,
          acceptingPatients,
          sortBy,
          sortOrder: sortOrder === 1 ? 'asc' : 'desc'
        },
        availableFilters: {
          specializations: stats.specializations.filter(s => s),
          feeRange: { min: stats.minFee, max: stats.maxFee, avg: stats.avgFee },
          experienceRange: { min: stats.minExperience, max: stats.maxExperience },
          acceptingPatientsCount: stats.acceptingPatientsCount,
          totalDoctors: stats.totalCount
        }
      }
    })
  } catch (error) {
    console.error('Doctor search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}