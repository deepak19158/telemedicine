import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import connectDB from '../../../../lib/db'
import User from '../../../../server/models/User'

// GET /api/doctors/availability - Get doctor availability
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

    const doctor = await User.findById(session.user.id)
      .select('profile.availability profile.workingHours profile.timeSlots profile.acceptingNewPatients')

    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      availability: doctor.profile.availability || {},
      workingHours: doctor.profile.workingHours || {},
      timeSlots: doctor.profile.timeSlots || {},
      acceptingNewPatients: doctor.profile.acceptingNewPatients || false
    })
  } catch (error) {
    console.error('Get doctor availability error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/doctors/availability - Set working hours and availability
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    const doctor = await User.findById(session.user.id)
    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { workingHours, timeSlots, acceptingNewPatients, breakTimes, blockedDates } = body

    const updateData: any = {}

    // Validate and set working hours
    if (workingHours) {
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const validWorkingHours: any = {}

      for (const day of daysOfWeek) {
        if (workingHours[day]) {
          const { enabled, startTime, endTime } = workingHours[day]
          
          if (enabled) {
            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
              return NextResponse.json(
                { error: `Invalid time format for ${day}. Use HH:MM format.` },
                { status: 400 }
              )
            }

            // Validate that end time is after start time
            const start = new Date(`2000-01-01T${startTime}:00`)
            const end = new Date(`2000-01-01T${endTime}:00`)
            if (end <= start) {
              return NextResponse.json(
                { error: `End time must be after start time for ${day}` },
                { status: 400 }
              )
            }

            validWorkingHours[day] = { enabled, startTime, endTime }
          } else {
            validWorkingHours[day] = { enabled: false }
          }
        }
      }

      updateData['profile.workingHours'] = validWorkingHours
    }

    // Validate and set time slots
    if (timeSlots) {
      const { duration, bufferTime } = timeSlots
      
      if (duration) {
        const validDurations = [15, 30, 45, 60]
        if (!validDurations.includes(parseInt(duration))) {
          return NextResponse.json(
            { error: 'Time slot duration must be 15, 30, 45, or 60 minutes' },
            { status: 400 }
          )
        }
        updateData['profile.timeSlots.duration'] = parseInt(duration)
      }

      if (bufferTime !== undefined) {
        const buffer = parseInt(bufferTime)
        if (buffer < 0 || buffer > 30) {
          return NextResponse.json(
            { error: 'Buffer time must be between 0 and 30 minutes' },
            { status: 400 }
          )
        }
        updateData['profile.timeSlots.bufferTime'] = buffer
      }
    }

    // Set patient acceptance status
    if (acceptingNewPatients !== undefined) {
      updateData['profile.acceptingNewPatients'] = Boolean(acceptingNewPatients)
    }

    // Set break times
    if (breakTimes) {
      const validBreakTimes: any = {}
      for (const [day, breaks] of Object.entries(breakTimes)) {
        if (Array.isArray(breaks)) {
          validBreakTimes[day] = breaks.map((breakTime: any) => {
            const { startTime, endTime, title } = breakTime
            
            // Validate break time format
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
              throw new Error(`Invalid break time format for ${day}`)
            }

            return { startTime, endTime, title: title || 'Break' }
          })
        }
      }
      updateData['profile.breakTimes'] = validBreakTimes
    }

    // Set blocked dates
    if (blockedDates && Array.isArray(blockedDates)) {
      const validBlockedDates = blockedDates.map((blockedDate: any) => {
        const { date, reason, allDay, startTime, endTime } = blockedDate
        
        // Validate date
        if (!date || !Date.parse(date)) {
          throw new Error('Invalid blocked date format')
        }

        const blocked: any = {
          date: new Date(date),
          reason: reason || 'Unavailable',
          allDay: Boolean(allDay)
        }

        if (!allDay && startTime && endTime) {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
          if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            throw new Error('Invalid time format for blocked date')
          }
          blocked.startTime = startTime
          blocked.endTime = endTime
        }

        return blocked
      })

      updateData['profile.blockedDates'] = validBlockedDates
    }

    // Update doctor availability
    const updatedDoctor = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { 
        new: true,
        runValidators: true,
        select: 'profile.workingHours profile.timeSlots profile.acceptingNewPatients profile.breakTimes profile.blockedDates'
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
      availability: updatedDoctor.profile
    })
  } catch (error) {
    console.error('Update doctor availability error:', error)
    
    if (error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}