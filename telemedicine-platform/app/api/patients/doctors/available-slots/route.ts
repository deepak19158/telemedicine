import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import connectDB from '../../../../../lib/db'
import User from '../../../../../server/models/User'
import Appointment from '../../../../../server/models/Appointment'

// GET /api/patients/doctors/available-slots - Get available appointment slots
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Access denied. Patient role required.' },
        { status: 403 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const days = parseInt(searchParams.get('days') || '7')

    if (!doctorId) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      )
    }

    // Verify doctor exists and is active
    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      isActive: true
    }).select('profile.availability profile.name profile.consultationFee')

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found or not available' },
        { status: 404 }
      )
    }

    // Set date range
    const searchStartDate = startDate ? new Date(startDate) : new Date()
    const searchEndDate = endDate ? new Date(endDate) : new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    // Ensure start date is not in the past
    if (searchStartDate < new Date()) {
      searchStartDate.setTime(new Date().getTime())
    }

    // Get booked appointments in the date range
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: {
        $gte: searchStartDate,
        $lte: searchEndDate
      },
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('appointmentDate')

    const bookedSlots = new Set(
      bookedAppointments.map(apt => apt.appointmentDate.toISOString())
    )

    // Default availability (9 AM to 6 PM, excluding lunch 1-2 PM)
    const defaultAvailability = {
      monday: { enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
      tuesday: { enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
      wednesday: { enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
      thursday: { enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
      friday: { enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
      saturday: { enabled: true, startTime: '09:00', endTime: '15:00', breakStart: null, breakEnd: null },
      sunday: { enabled: false, startTime: null, endTime: null, breakStart: null, breakEnd: null }
    }

    // Use doctor's availability or default
    const availability = doctor.profile?.availability || defaultAvailability

    // Generate available slots
    const availableSlots = []
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    
    for (let d = new Date(searchStartDate); d <= searchEndDate; d.setDate(d.getDate() + 1)) {
      const dayName = dayNames[d.getDay()]
      const dayAvailability = availability[dayName]
      
      if (!dayAvailability?.enabled) continue

      const date = new Date(d)
      const dateStr = date.toISOString().split('T')[0]
      
      // Generate time slots (30-minute intervals)
      const slots = generateTimeSlots(
        dayAvailability.startTime,
        dayAvailability.endTime,
        dayAvailability.breakStart,
        dayAvailability.breakEnd,
        30 // 30-minute slots
      )

      const daySlots = []
      
      for (const slot of slots) {
        const slotDateTime = new Date(`${dateStr}T${slot}:00`)
        const slotISOString = slotDateTime.toISOString()
        
        // Skip past slots and booked slots
        if (slotDateTime > new Date() && !bookedSlots.has(slotISOString)) {
          daySlots.push({
            time: slot,
            datetime: slotISOString,
            available: true
          })
        }
      }

      if (daySlots.length > 0) {
        availableSlots.push({
          date: dateStr,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          slots: daySlots
        })
      }
    }

    return NextResponse.json({
      success: true,
      doctor: {
        id: doctor._id,
        name: doctor.profile.name,
        consultationFee: doctor.profile.consultationFee || 500
      },
      dateRange: {
        startDate: searchStartDate.toISOString().split('T')[0],
        endDate: searchEndDate.toISOString().split('T')[0]
      },
      availability: availableSlots,
      totalSlots: availableSlots.reduce((total, day) => total + day.slots.length, 0)
    })

  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate time slots
function generateTimeSlots(
  startTime: string,
  endTime: string,
  breakStart: string | null,
  breakEnd: string | null,
  intervalMinutes: number = 30
): string[] {
  const slots = []
  
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  const breakStartTime = breakStart ? parseTime(breakStart) : null
  const breakEndTime = breakEnd ? parseTime(breakEnd) : null
  
  let current = start
  
  while (current < end) {
    const timeStr = formatTime(current)
    
    // Skip break time
    if (breakStartTime && breakEndTime && current >= breakStartTime && current < breakEndTime) {
      current += intervalMinutes
      continue
    }
    
    slots.push(timeStr)
    current += intervalMinutes
  }
  
  return slots
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}