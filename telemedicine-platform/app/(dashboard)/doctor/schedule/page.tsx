'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { Calendar, Clock, Plus, Settings, Save, X } from 'lucide-react'

export default function DoctorSchedule() {
  const { user, isLoading } = useRequireRole('doctor')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  const currentSchedule = {
    monday: { enabled: true, start: '09:00', end: '17:00', slots: 30 },
    tuesday: { enabled: true, start: '09:00', end: '17:00', slots: 30 },
    wednesday: { enabled: true, start: '09:00', end: '17:00', slots: 30 },
    thursday: { enabled: true, start: '09:00', end: '17:00', slots: 30 },
    friday: { enabled: true, start: '09:00', end: '15:00', slots: 30 },
    saturday: { enabled: false, start: '10:00', end: '14:00', slots: 45 },
    sunday: { enabled: false, start: '10:00', end: '14:00', slots: 45 }
  }

  const blockedSlots = [
    { date: '2025-07-21', time: '14:00', reason: 'Lunch Break' },
    { date: '2025-07-22', time: '10:30', reason: 'Medical Conference' },
    { date: '2025-07-23', time: '16:00', reason: 'Personal Appointment' }
  ]

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ]

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Schedule Management</h1>
            <p className="text-body">Manage your availability and time slots for patient consultations.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">40</div>
              <div className="text-caption">Hours/Week</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">30</div>
              <div className="text-caption">Min/Slot</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">80</div>
              <div className="text-caption">Available Slots</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <X className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{blockedSlots.length}</div>
              <div className="text-caption">Blocked Slots</div>
            </div>
          </div>

          {/* Weekly Schedule Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Weekly Schedule</h2>
                <button className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
              <div className="space-y-4">
                {weekDays.map((day) => {
                  const dayKey = day.toLowerCase()
                  const schedule = currentSchedule[dayKey as keyof typeof currentSchedule]
                  return (
                    <div key={day} className="p-4 bg-medical-50 rounded-xl border border-medical-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={schedule.enabled}
                            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                          />
                          <label className="ml-2 font-semibold text-medical-900">{day}</label>
                        </div>
                        <span className={`badge-${schedule.enabled ? 'success' : 'info'}`}>
                          {schedule.enabled ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      
                      {schedule.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-medical-700 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={schedule.start}
                              className="input-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-medical-700 mb-1">End Time</label>
                            <input
                              type="time"
                              value={schedule.end}
                              className="input-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-medical-700 mb-1">Slot Duration</label>
                            <select className="input-primary">
                              <option value="15">15 minutes</option>
                              <option value="30" selected={schedule.slots === 30}>30 minutes</option>
                              <option value="45" selected={schedule.slots === 45}>45 minutes</option>
                              <option value="60">60 minutes</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Blocked Time Slots */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Blocked Time Slots</h2>
                <button className="btn-accent">
                  <Plus className="w-4 h-4 mr-2" />
                  Block Time
                </button>
              </div>
              <div className="space-y-4">
                {blockedSlots.map((slot, index) => (
                  <div key={index} className="p-4 bg-warning-50 rounded-xl border border-warning-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-medical-900">{slot.date}</div>
                        <div className="text-sm text-medical-600">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {slot.time}
                        </div>
                        <div className="text-sm text-medical-700 mt-1">{slot.reason}</div>
                      </div>
                      <button className="btn-outline text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add New Blocked Slot Form */}
                <div className="p-4 bg-white rounded-xl border border-medical-200">
                  <h4 className="font-medium text-medical-900 mb-3">Block New Time Slot</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-medical-700 mb-1">Date</label>
                      <input type="date" className="input-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-medical-700 mb-1">Time</label>
                      <select className="input-primary">
                        <option>Select time...</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-medical-700 mb-1">Reason</label>
                      <input
                        type="text"
                        placeholder="Enter reason for blocking..."
                        className="input-primary"
                      />
                    </div>
                    <button className="btn-primary w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Block Time Slot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Schedule Preferences</h2>
              <button className="btn-outline">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Advance Booking Window
                  </label>
                  <select className="input-primary">
                    <option>1 day in advance</option>
                    <option>3 days in advance</option>
                    <option>1 week in advance</option>
                    <option>2 weeks in advance</option>
                    <option>1 month in advance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Buffer Time Between Appointments
                  </label>
                  <select className="input-primary">
                    <option>No buffer</option>
                    <option>5 minutes</option>
                    <option>10 minutes</option>
                    <option>15 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Maximum Appointments Per Day
                  </label>
                  <input type="number" min="1" max="20" value="12" className="input-primary" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Time Zone
                  </label>
                  <select className="input-primary">
                    <option>Eastern Time (EST)</option>
                    <option>Central Time (CST)</option>
                    <option>Mountain Time (MST)</option>
                    <option>Pacific Time (PST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Auto-Accept Appointments
                  </label>
                  <select className="input-primary">
                    <option>Manual approval required</option>
                    <option>Auto-accept during business hours</option>
                    <option>Auto-accept all appointments</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Emergency Consultation Hours
                  </label>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" className="w-4 h-4 text-primary-600" />
                    <span className="text-sm text-medical-700">Available for emergency consultations</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-medical-200">
              <div className="flex justify-end space-x-4">
                <button className="btn-outline">Cancel</button>
                <button className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}