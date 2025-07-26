'use client'

import { useRequireRole } from '../../../lib/hooks/useAuth'
import { useUserProfile, useLoadingTimeout, useApi } from '../../../lib/hooks/useApi'
import { apiClient } from '../../../lib/api-client'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui'
import { Calendar, FileText, UserCheck, CreditCard, Clock, Activity, Plus, User, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import BookingWizard from '../../../components/booking/BookingWizard'

export default function PatientDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useRequireRole('patient')
  const [showBookingWizard, setShowBookingWizard] = useState(false)
  
  // Only fetch profile data AFTER authentication is confirmed and user exists
  const shouldFetchProfile = isAuthenticated && user && !authLoading
  const { data: userProfile, loading: profileLoading, error: profileError } = useUserProfile({
    enabled: shouldFetchProfile
  })

  // Fetch appointments data
  const { 
    data: appointmentsData, 
    loading: appointmentsLoading, 
    refetch: refetchAppointments 
  } = useApi(() => shouldFetchProfile ? apiClient.get('/patients/appointments', { limit: 5 }) : null)

  // Fetch assigned doctor data
  const { 
    data: assignedDoctorData, 
    loading: doctorLoading 
  } = useApi(() => shouldFetchProfile ? apiClient.get('/patients/doctors/assigned') : null)

  console.log('🔐 Auth state:', { authLoading, isAuthenticated, hasUser: !!user, shouldFetchProfile })
  console.log('📊 Profile state:', { profileLoading, hasProfile: !!userProfile, profileError })

  const isLoading = authLoading || (shouldFetchProfile && profileLoading)
  const hasTimedOut = useLoadingTimeout(isLoading, 15000) // 15 second timeout

  if (isLoading) {
    console.log('⏳ Still loading - Auth:', authLoading, 'Profile:', profileLoading)
    
    if (hasTimedOut) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
          <div className="card-medical text-center max-w-md">
            <h2 className="heading-secondary text-warning-600 mb-4">Taking longer than expected...</h2>
            <p className="text-body mb-4">
              The page is taking a while to load. This might be due to a slow connection.
            </p>
            <div className="space-y-2">
              <button 
                className="btn-primary w-full"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button 
                className="btn-outline w-full"
                onClick={() => {
                  // Clear any cached data and try again
                  localStorage.clear()
                  window.location.href = '/login'
                }}
              >
                Start Over
              </button>
            </div>
            <p className="text-xs text-medical-500 mt-4">
              If this keeps happening, please contact support.
            </p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="text-center">
          <div className="spinner-medical w-16 h-16 mx-auto mb-4"></div>
          <p className="text-medical-600">
            {authLoading ? 'Authenticating...' : 'Loading your profile...'}
          </p>
          <p className="text-xs text-medical-400 mt-2">
            This should only take a few seconds
          </p>
        </div>
      </div>
    )
  }

  if (profileError && shouldFetchProfile) {
    console.log('❌ Profile error:', profileError)
    return (
      <div className="min-h-screen bg-medical-gradient-soft flex items-center justify-center">
        <div className="card-medical text-center max-w-md">
          <h2 className="heading-secondary text-error-600 mb-2">Error Loading Profile</h2>
          <p className="text-body mb-4">{profileError}</p>
          <div className="space-y-2">
            <button 
              className="btn-primary w-full"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
            <button 
              className="btn-outline w-full"
              onClick={() => {
                // Force refetch profile data
                window.location.href = '/patient'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate real stats from appointments data
  const appointments = appointmentsData?.appointments || []
  const stats = {
    upcomingAppointments: appointments.filter((apt: any) => 
      ['scheduled', 'confirmed'].includes(apt.status) && 
      new Date(apt.appointmentDate) >= new Date()
    ).length,
    medicalRecords: appointments.filter((apt: any) => 
      apt.status === 'completed' && apt.consultationNotes
    ).length,
    totalConsultations: appointments.filter((apt: any) => 
      apt.status === 'completed'
    ).length,
    pendingReviews: appointments.filter((apt: any) => 
      apt.status === 'completed' && !apt.patientFeedback
    ).length
  }

  // Generate recent activity from real appointments data
  const recentActivity = appointments.slice(0, 5).map((apt: any) => {
    const doctorName = apt.doctorId?.profile?.name || apt.doctorId?.name || 'Doctor'
    const appointmentDate = new Date(apt.appointmentDate)
    
    return {
      id: apt._id,
      type: 'appointment',
      title: `Appointment ${apt.status === 'completed' ? 'Completed' : 'Scheduled'}`,
      description: `Consultation with ${doctorName} - ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      status: apt.status === 'completed' ? 'completed' : apt.status === 'cancelled' ? 'cancelled' : 'upcoming',
      timestamp: apt.createdAt,
      appointmentData: apt
    }
  })

  console.log('✅ Rendering dashboard with data:', { user: !!user, userProfile: !!userProfile, stats })

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">
              Welcome back, {userProfile?.profile?.name || user?.name}!
            </h1>
            <p className="text-body">
              Manage your healthcare appointments and access your medical information.
            </p>
            {userProfile?.profile?.lastLoginAt && (
              <p className="text-caption mt-2">
                Last login: {new Date(userProfile.profile.lastLoginAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.upcomingAppointments}</div>
              <div className="text-caption">Upcoming Appointments</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.medicalRecords}</div>
              <div className="text-caption">Medical Records</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.totalConsultations}</div>
              <div className="text-caption">Consultations</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.pendingReviews}</div>
              <div className="text-caption">Pending Reviews</div>
            </div>
          </div>
          
          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card-elevated">
              <div className="card-header">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="heading-tertiary">Book Appointment</h3>
                </div>
              </div>
              <div>
                <p className="text-body mb-4">
                  Schedule a consultation with your assigned healthcare provider.
                </p>
                <button 
                  className="btn-primary w-full"
                  onClick={() => setShowBookingWizard(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Now
                </button>
              </div>
            </div>
            
            <div className="card-elevated">
              <div className="card-header">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-5 h-5 text-accent-600" />
                  </div>
                  <h3 className="heading-tertiary">Medical History</h3>
                </div>
              </div>
              <div>
                <p className="text-body mb-4">
                  Access your complete medical records, test results, and prescriptions.
                </p>
                <button className="btn-secondary w-full">
                  View Records
                </button>
              </div>
            </div>
            
            <div className="card-elevated">
              <div className="card-header">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center mr-3">
                    <Stethoscope className="w-5 h-5 text-success-600" />
                  </div>
                  <h3 className="heading-tertiary">My Doctor</h3>
                </div>
              </div>
              <div>
                {assignedDoctorData?.assignedDoctor ? (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <User className="w-4 h-4 text-medical-600 mr-2" />
                        <span className="font-medium text-medical-900">
                          {assignedDoctorData.assignedDoctor.name}
                        </span>
                      </div>
                      <p className="text-sm text-primary-600 mb-1">
                        {assignedDoctorData.assignedDoctor.specialization}
                      </p>
                      <p className="text-xs text-medical-600">
                        Fee: ₹{assignedDoctorData.assignedDoctor.consultationFee}
                      </p>
                    </div>
                    <button className="btn-accent w-full">
                      View Profile
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-body mb-4 text-warning-600">
                      No doctor assigned yet. Contact admin for assignment.
                    </p>
                    <button className="btn-outline w-full" disabled>
                      No Doctor Assigned
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <h2 className="heading-secondary mb-6">Recent Activity</h2>
            <div className="card-elevated">
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => {
                    const getActivityIcon = (type: string) => {
                      switch (type) {
                        case 'appointment':
                          return Calendar
                        case 'results':
                          return FileText
                        case 'payment':
                          return CreditCard
                        default:
                          return Activity
                      }
                    }
                    
                    const getStatusBadgeClass = (status: string) => {
                      switch (status) {
                        case 'completed':
                          return 'badge-success'
                        case 'upcoming':
                        case 'scheduled':
                        case 'confirmed':
                          return 'badge-info'
                        case 'cancelled':
                          return 'badge-error'
                        default:
                          return 'badge-info'
                      }
                    }
                    
                    const getBgClass = (status: string) => {
                      switch (status) {
                        case 'completed':
                          return 'bg-success-50'
                        case 'upcoming':
                        case 'scheduled':
                        case 'confirmed':
                          return 'bg-primary-50'
                        case 'cancelled':
                          return 'bg-error-50'
                        default:
                          return 'bg-medical-50'
                      }
                    }
                    
                    const getIconBgClass = (status: string) => {
                      switch (status) {
                        case 'completed':
                          return 'bg-success-600'
                        case 'upcoming':
                        case 'scheduled':
                        case 'confirmed':
                          return 'bg-primary-600'
                        case 'cancelled':
                          return 'bg-error-600'
                        default:
                          return 'bg-medical-600'
                      }
                    }
                    
                    const Icon = getActivityIcon(activity.type)
                    
                    return (
                      <div key={activity.id} className={`flex items-center p-4 ${getBgClass(activity.status)} rounded-lg`}>
                        <div className={`w-10 h-10 ${getIconBgClass(activity.status)} rounded-full flex items-center justify-center mr-4`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-medical-900">{activity.title}</p>
                          <p className="text-caption">{activity.description}</p>
                          {activity.timestamp && (
                            <p className="text-xs text-medical-500 mt-1">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className={getStatusBadgeClass(activity.status)}>
                          {activity.status}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-medical-300 mx-auto mb-3" />
                    <p className="text-body text-medical-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Wizard Modal */}
          {showBookingWizard && (
            <BookingWizard
              onClose={() => setShowBookingWizard(false)}
              onComplete={(appointmentData) => {
                setShowBookingWizard(false)
                refetchAppointments() // Refresh appointments list
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}