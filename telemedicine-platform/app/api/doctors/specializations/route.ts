import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// GET /api/doctors/specializations - Medical specialization management
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Get available specializations with doctor counts
    const specializationStats = await User.aggregate([
      {
        $match: { 
          role: 'doctor',
          isActive: true,
          'profile.specialization': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$profile.specialization',
          doctorCount: { $sum: 1 },
          avgConsultationFee: { $avg: '$profile.consultationFee' },
          avgExperience: { $avg: '$profile.experience' },
          acceptingNewPatients: { 
            $sum: { $cond: ['$profile.acceptingNewPatients', 1, 0] } 
          }
        }
      },
      {
        $sort: { doctorCount: -1 }
      }
    ])

    // Predefined specializations list
    const allSpecializations = [
      {
        name: 'General Medicine',
        description: 'Primary care and general health consultation',
        icon: 'stethoscope'
      },
      {
        name: 'Cardiology',
        description: 'Heart and cardiovascular system',
        icon: 'heart'
      },
      {
        name: 'Dermatology',
        description: 'Skin, hair, and nail conditions',
        icon: 'skin'
      },
      {
        name: 'Pediatrics',
        description: 'Medical care for infants, children, and adolescents',
        icon: 'baby'
      },
      {
        name: 'Orthopedics',
        description: 'Musculoskeletal system and injuries',
        icon: 'bone'
      },
      {
        name: 'Neurology',
        description: 'Brain and nervous system disorders',
        icon: 'brain'
      },
      {
        name: 'Psychiatry',
        description: 'Mental health and psychological disorders',
        icon: 'psychology'
      },
      {
        name: 'Oncology',
        description: 'Cancer diagnosis and treatment',
        icon: 'medical'
      },
      {
        name: 'Gynecology',
        description: 'Women\'s reproductive health',
        icon: 'female'
      },
      {
        name: 'Ophthalmology',
        description: 'Eye and vision care',
        icon: 'eye'
      },
      {
        name: 'ENT',
        description: 'Ear, nose, and throat conditions',
        icon: 'ear'
      },
      {
        name: 'Emergency Medicine',
        description: 'Urgent and emergency medical care',
        icon: 'emergency'
      },
      {
        name: 'Internal Medicine',
        description: 'Internal organ systems and diseases',
        icon: 'internal'
      },
      {
        name: 'Family Medicine',
        description: 'Comprehensive family healthcare',
        icon: 'family'
      },
      {
        name: 'Radiology',
        description: 'Medical imaging and diagnostics',
        icon: 'xray'
      },
      {
        name: 'Anesthesiology',
        description: 'Anesthesia and pain management',
        icon: 'injection'
      },
      {
        name: 'Pathology',
        description: 'Disease diagnosis through lab analysis',
        icon: 'microscope'
      },
      {
        name: 'Surgery',
        description: 'Surgical procedures and interventions',
        icon: 'surgery'
      },
      {
        name: 'Urology',
        description: 'Urinary tract and male reproductive system',
        icon: 'urology'
      },
      {
        name: 'Endocrinology',
        description: 'Hormones and endocrine system',
        icon: 'hormone'
      }
    ]

    // Merge predefined specializations with stats
    const specializations = allSpecializations.map(spec => {
      const stats = specializationStats.find(stat => stat._id === spec.name)
      return {
        ...spec,
        doctorCount: stats?.doctorCount || 0,
        avgConsultationFee: stats?.avgConsultationFee || 0,
        avgExperience: stats?.avgExperience || 0,
        acceptingNewPatients: stats?.acceptingNewPatients || 0,
        available: (stats?.doctorCount || 0) > 0
      }
    })

    // Summary statistics
    const totalDoctors = await User.countDocuments({ 
      role: 'doctor', 
      isActive: true 
    })

    const availableSpecializations = specializations.filter(spec => spec.available).length

    return NextResponse.json({
      success: true,
      specializations,
      summary: {
        totalSpecializations: specializations.length,
        availableSpecializations,
        totalActiveDoctors: totalDoctors,
        mostPopularSpecialization: specializationStats[0]?._id || null
      }
    })
  } catch (error) {
    console.error('Get specializations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}