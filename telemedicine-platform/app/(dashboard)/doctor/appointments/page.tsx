'use client'

import { useState, useEffect } from 'react'
import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { useApi } from '../../../../lib/hooks/useApi'
import { Calendar, Clock, User, Video, Phone, FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export default function DoctorAppointments() {
  const { user, isLoading } = useRequireRole('doctor')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('7')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Fetch appointments data
  const { 
    data: appointmentsData, 
    loading: appointmentsLoading, 
    error: appointmentsError,
    refetch: refetchAppointments 
  } = useApi('/api/doctors/appointments', {
    method: 'GET'
  })

  // Handle appointment action updates
  const handleAppointmentAction = async (appointmentId: string, action: string) => {
    try {
      setActionLoading(appointmentId)
      
      const response = await fetch(`/api/doctors/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: action,
          updatedAt: new Date()
        }),
      })

      if (response.ok) {
        await refetchAppointments()
      } else {
        console.error('Failed to update appointment')
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading || appointmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  if (appointmentsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="text-center">
          <div className="text-error-600 mb-4">
            <XCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Error Loading Appointments</h2>
            <p className="text-medical-600 mt-2">Unable to load appointment data. Please try again.</p>
          </div>
          <button 
            onClick={() => refetchAppointments()}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Get appointments from API data
  const appointments = appointmentsData?.appointments || []
  const stats = appointmentsData?.stats || {
    total: 0,
    today: 0,
    completed: 0,
    pending: 0,
    uniquePatients: 0
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'upcoming':
        return <span className="badge-info">Scheduled</span>
      case 'completed':
        return <span className="badge-success">Completed</span>
      case 'pending':
      case 'pending_approval':
        return <span className="badge-warning">Pending</span>
      case 'cancelled':
        return <span className="badge-error">Cancelled</span>
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
      case 'Video Consultation':
        return <Video className="w-4 h-4" />
      case 'phone':
      case 'Phone Consultation':
        return <Phone className="w-4 h-4" />
      case 'in-person':
        return <User className="w-4 h-4" />
      default:
        return <Calendar className="w-4 h-4" />
    }
  }

  // Filter appointments
  const today = new Date().toDateString()
  const todayAppointments = appointments.filter(apt => 
    new Date(apt.appointmentDate).toDateString() === today
  )
  
  // Filter past appointments based on selected filters
  const filteredAppointments = appointments.filter(apt => {
    const appointmentDate = new Date(apt.appointmentDate)
    const daysDiff = Math.floor((Date.now() - appointmentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Date filter
    if (daysDiff > parseInt(dateFilter)) return false
    
    // Status filter
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false
    
    return true
  })

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Appointment Management</h1>
            <p className="text-body">Manage your patient consultations and schedule.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.today || todayAppointments.length}</div>
              <div className="text-caption">Today's Appointments</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.completed || appointments.filter(a => a.status === 'completed').length}</div>
              <div className="text-caption">Completed</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.pending || appointments.filter(a => a.status === 'pending').length}</div>
              <div className="text-caption">Pending</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.uniquePatients || new Set(appointments.map(a => a.patientId?._id || a.patientId)).size}</div>
              <div className="text-caption">Unique Patients</div>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="mb-8">
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Today's Schedule</h2>
                <div className="flex space-x-2">
                  <button className="btn-primary">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Calendar
                  </button>
                  <button className="btn-outline">
                    <Clock className="w-4 h-4 mr-2" />
                    Block Time
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {todayAppointments.length > 0 ? (
                  todayAppointments.map((appointment: any) => (
                    <div key={appointment._id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3 text-primary-600">
                              {getTypeIcon(appointment.consultationType)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-medical-900">
                                {appointment.patientId?.profile?.name || appointment.patientId?.name || 'Patient'}
                              </h3>
                              <p className="text-caption text-medical-600">
                                Patient ID: {appointment.patientId?._id?.slice(-6) || 'N/A'}
                              </p>
                            </div>
                            {getStatusBadge(appointment.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-medical-600 mb-3">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              {new Date(appointment.appointmentDate).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} 
                              ({appointment.duration || '30 min'})
                            </div>
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-2" />
                              {appointment.reasonForVisit || 'Consultation'}
                            </div>
                            {appointment.consultationFee && (
                              <div className="flex items-center">
                                <span className="text-sm">Fee: ₹{appointment.consultationFee}</span>
                              </div>
                            )}
                          </div>
                          
                          {appointment.patientNotes && (
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-sm text-medical-700">
                                <strong>Patient Notes:</strong> {appointment.patientNotes}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row gap-2">
                          {(appointment.status === 'scheduled' || appointment.status === 'upcoming') && (
                            <>
                              {appointment.consultationType === 'video' && (
                                <button className="btn-primary">
                                  <Video className="w-4 h-4 mr-2" />
                                  Start Call
                                </button>
                              )}
                              <button className="btn-outline">
                                <User className="w-4 h-4 mr-2" />
                                Patient History
                              </button>
                              <button 
                                className="btn-secondary"
                                onClick={() => handleAppointmentAction(appointment._id, 'completed')}
                                disabled={actionLoading === appointment._id}
                              >
                                {actionLoading === appointment._id ? 'Processing...' : 'Mark Complete'}
                              </button>
                            </>
                          )}
                          {(appointment.status === 'pending_approval' || appointment.status === 'pending') && (
                            <>
                              <button 
                                className="btn-accent"
                                onClick={() => handleAppointmentAction(appointment._id, 'scheduled')}
                                disabled={actionLoading === appointment._id}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {actionLoading === appointment._id ? 'Processing...' : 'Approve'}
                              </button>
                              <button 
                                className="btn-outline"
                                onClick={() => handleAppointmentAction(appointment._id, 'cancelled')}
                                disabled={actionLoading === appointment._id}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                {actionLoading === appointment._id ? 'Processing...' : 'Decline'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-medical-900 mb-2">
                      No appointments scheduled for today
                    </h3>
                    <p className="text-medical-600">
                      Your schedule is clear for today.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Past Appointments */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Recent Appointments</h2>
              <div className="flex space-x-2">
                <select 
                  className="input-primary"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                <select 
                  className="input-primary"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 3 Months</option>
                </select>
                <button 
                  onClick={() => refetchAppointments()}
                  className="btn-outline"
                  disabled={appointmentsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${appointmentsLoading ? 'animate-spin' : ''}`} />
                  {appointmentsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment: any) => (
                  <div key={appointment._id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                            appointment.status === 'completed' 
                              ? 'bg-success-100 text-success-600' 
                              : 'bg-medical-100 text-medical-600'
                          }`}>
                            {getTypeIcon(appointment.consultationType)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-medical-900">
                              {appointment.patientId?.profile?.name || appointment.patientId?.name || 'Patient'}
                            </h3>
                            <p className="text-caption text-medical-600">
                              {new Date(appointment.appointmentDate).toLocaleDateString()} at {new Date(appointment.appointmentDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                        
                        <div className="text-sm text-medical-600 mb-3">
                          <strong>Reason:</strong> {appointment.reasonForVisit || 'Consultation'}
                        </div>
                        
                        {appointment.consultationNotes && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-sm text-medical-700">
                              <strong>Consultation Notes:</strong> {appointment.consultationNotes}
                            </p>
                          </div>
                        )}
                        
                        {appointment.prescription && (
                          <div className="bg-blue-50 rounded-lg p-3 mt-2">
                            <p className="text-sm text-medical-700">
                              <strong>Prescription:</strong> {appointment.prescription}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row gap-2">
                        {appointment.consultationNotes && (
                          <button className="btn-primary">
                            <FileText className="w-4 h-4 mr-2" />
                            View Notes
                          </button>
                        )}
                        <button className="btn-outline">
                          <User className="w-4 h-4 mr-2" />
                          Patient History
                        </button>
                        {appointment.status === 'completed' && (
                          <button className="btn-secondary">
                            Generate Report
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-medical-900 mb-2">
                    No past appointments found
                  </h3>
                  <p className="text-medical-600">
                    Past appointments will appear here once you complete consultations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}