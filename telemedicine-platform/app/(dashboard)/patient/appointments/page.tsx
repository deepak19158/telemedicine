'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { useApi } from '../../../../lib/hooks/useApi'
import { apiClient } from '../../../../lib/api-client'
import { Calendar, Clock, User, MapPin, Phone, Video, AlertCircle, Plus, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import BookingWizard from '../../../../components/booking/BookingWizard'

export default function PatientAppointments() {
  const { user, isLoading: authLoading } = useRequireRole('patient')
  const [filter, setFilter] = useState('all')
  const [showBookingWizard, setShowBookingWizard] = useState(false)
  
  // Fetch appointments data
  const { 
    data: appointmentsData, 
    loading: appointmentsLoading, 
    error: appointmentsError,
    refetch: refetchAppointments
  } = useApi(() => apiClient.get('/patients/appointments', { status: filter !== 'all' ? filter : undefined }))

  const isLoading = authLoading || appointmentsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  if (appointmentsError) {
    return (
      <div className="min-h-screen bg-medical-gradient-soft">
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="card-medical text-center max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
            <h2 className="heading-secondary text-error-600 mb-2">Error Loading Appointments</h2>
            <p className="text-body mb-4">{appointmentsError}</p>
            <button 
              className="btn-primary"
              onClick={() => refetchAppointments()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const appointments = appointmentsData?.appointments || []
  
  // Filter appointments based on selected filter
  const filteredAppointments = appointments.filter((appointment: any) => {
    if (filter === 'all') return true
    return appointment.status === filter
  })

  // Stats for quick actions
  const upcomingCount = appointments.filter((apt: any) => apt.status === 'upcoming').length
  const hasVideoCallNow = appointments.some((apt: any) => 
    apt.status === 'upcoming' && 
    apt.type === 'Video Consultation' &&
    new Date(apt.appointmentDate) <= new Date(Date.now() + 30 * 60 * 1000) // Within 30 minutes
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <span className="badge-info">Upcoming</span>
      case 'completed':
        return <span className="badge-success">Completed</span>
      case 'cancelled':
        return <span className="badge-error">Cancelled</span>
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">My Appointments</h1>
            <p className="text-body">Manage your scheduled consultations and view appointment history.</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Book New Appointment</h3>
              <button 
                className="btn-primary w-full"
                onClick={() => setShowBookingWizard(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Now
              </button>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Video className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Join Video Call</h3>
              <button 
                className={`w-full ${hasVideoCallNow ? 'btn-accent' : 'btn-outline'}`}
                disabled={!hasVideoCallNow}
              >
                {hasVideoCallNow ? 'Join Now' : 'No Active Calls'}
              </button>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Emergency Contact</h3>
              <button className="btn-outline w-full">Call Now</button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-medical-100 p-1 rounded-lg w-fit">
              {[
                { key: 'all', label: 'All', count: appointments.length },
                { key: 'upcoming', label: 'Upcoming', count: appointments.filter((apt: any) => apt.status === 'upcoming').length },
                { key: 'completed', label: 'Completed', count: appointments.filter((apt: any) => apt.status === 'completed').length },
                { key: 'cancelled', label: 'Cancelled', count: appointments.filter((apt: any) => apt.status === 'cancelled').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-medical-600 hover:text-medical-900'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Appointments List */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Appointments</h2>
              <button 
                onClick={() => refetchAppointments()}
                className="btn-outline"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-4">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment: any) => (
                  <div key={appointment._id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <User className="w-5 h-5 text-primary-600 mr-2" />
                          <h3 className="font-semibold text-medical-900">
                            {appointment.doctorId?.profile?.name || 'Dr. ' + appointment.doctorId?.name || 'Doctor Name'}
                          </h3>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <p className="text-caption text-medical-600 mb-2">
                          {appointment.doctorId?.profile?.specialization || 'General Medicine'}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-medical-600">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(appointment.appointmentDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(appointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {appointment.consultationType === 'video' ? 'Online' : appointment.location || 'Medical Center'}
                          </div>
                          {appointment.consultationFee && (
                            <div className="flex items-center">
                              <span className="text-sm">₹{appointment.consultationFee}</span>
                            </div>
                          )}
                        </div>
                        {appointment.referralCode && (
                          <div className="mt-2">
                            <span className="text-xs bg-accent-100 text-accent-700 px-2 py-1 rounded">
                              Referral: {appointment.referralCode}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 md:mt-0 md:ml-6 flex flex-col sm:flex-row gap-2">
                        {appointment.status === 'scheduled' && (
                          <>
                            <button className="btn-primary">
                              {appointment.consultationType === 'video' ? 'Join Call' : 'View Details'}
                            </button>
                            <button className="btn-outline">Reschedule</button>
                          </>
                        )}
                        {appointment.status === 'completed' && (
                          <>
                            <button className="btn-secondary">View Report</button>
                            {appointment.consultationNotes && (
                              <button className="btn-outline">View Notes</button>
                            )}
                          </>
                        )}
                        {appointment.status === 'cancelled' && (
                          <button className="btn-outline" disabled>
                            Cancelled
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-medical-900 mb-2">
                    No {filter !== 'all' ? filter : ''} appointments found
                  </h3>
                  <p className="text-medical-600 mb-4">
                    {filter === 'all' 
                      ? "You haven't scheduled any appointments yet." 
                      : `No ${filter} appointments to display.`}
                  </p>
                  {filter === 'all' && (
                    <button 
                      className="btn-primary"
                      onClick={() => setShowBookingWizard(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Your First Appointment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking Wizard Modal */}
          {showBookingWizard && (
            <BookingWizard
              onClose={() => setShowBookingWizard(false)}
              onComplete={(appointmentData) => {
                setShowBookingWizard(false)
                refetchAppointments() // Refresh appointments list
                // Could show success toast here
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}