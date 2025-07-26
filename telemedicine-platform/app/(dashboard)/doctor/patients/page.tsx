'use client'

import { useState, useEffect } from 'react'
import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { useApi } from '../../../../lib/hooks/useApi'
import { apiClient } from '../../../../lib/api-client'
import { Users, Search, Calendar, FileText, Phone, Mail, MapPin, Heart, RefreshCw, XCircle } from 'lucide-react'

export default function DoctorPatients() {
  const { user, isLoading } = useRequireRole('doctor')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  
  // Fetch patient data using correct API client pattern
  const { 
    data: patientsData, 
    loading: patientsLoading, 
    error: patientsError,
    refetch: refetchPatients 
  } = useApi(() => apiClient.doctor.getPatients({
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    riskLevel: riskFilter !== 'all' ? riskFilter : undefined
  }))

  // Refetch when filters change (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refetchPatients()
    }, searchQuery ? 500 : 0) // 500ms debounce for search, immediate for other filters

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, riskFilter, refetchPatients])

  if (isLoading || patientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  if (patientsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="text-center">
          <div className="text-error-600 mb-4">
            <XCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Error Loading Patients</h2>
            <p className="text-medical-600 mt-2">Unable to load patient data. Please try again.</p>
          </div>
          <button 
            onClick={() => refetchPatients()}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Get patients from API data (already filtered server-side)
  const allPatients = patientsData?.patients || []
  const stats = patientsData?.stats || {
    total: 0,
    active: 0,
    upcoming: 0,
    highRisk: 0
  }

  // Use the data as-is since filtering is done server-side
  const filteredPatients = allPatients

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="badge-success">Active</span>
      case 'High Priority':
        return <span className="badge-error">High Priority</span>
      case 'Needs Follow-up':
        return <span className="badge-warning">Needs Follow-up</span>
      case 'Inactive':
        return <span className="badge-info">Inactive</span>
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-success-600'
      case 'medium':
        return 'text-warning-600'
      case 'high':
        return 'text-error-600'
      default:
        return 'text-medical-600'
    }
  }

  const getRiskLevelBg = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-success-100'
      case 'medium':
        return 'bg-warning-100'
      case 'high':
        return 'bg-error-100'
      default:
        return 'bg-medical-100'
    }
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Patient Management</h1>
            <p className="text-body">Manage your patient information and medical records.</p>
          </div>

          {/* Patient Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.total || allPatients.length}</div>
              <div className="text-caption">Total Patients</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.active || allPatients.filter(p => p.status === 'active').length}</div>
              <div className="text-caption">Active Patients</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.upcoming || allPatients.filter(p => p.nextAppointment).length}</div>
              <div className="text-caption">Upcoming Appointments</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-error-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-error-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.highRisk || allPatients.filter(p => p.riskLevel === 'high').length}</div>
              <div className="text-caption">High Risk</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card-elevated mb-8">
            <div className="card-header">
              <h2 className="heading-secondary">Search Patients</h2>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-medical-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or email..."
                    className="input-primary pl-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <select 
                  className="input-primary"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
                <select 
                  className="input-primary"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="all">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
                <button 
                  onClick={() => refetchPatients()}
                  className="btn-primary"
                  disabled={patientsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${patientsLoading ? 'animate-spin' : ''}`} />
                  {patientsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {/* Patients List */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">All Patients</h2>
              <button className="btn-primary">
                <Users className="w-4 h-4 mr-2" />
                Add New Patient
              </button>
            </div>
            <div className="space-y-4">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <div key={patient._id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                            <span className="text-primary-600 font-semibold text-lg">
                              {patient.profile?.name ? patient.profile.name.split(' ').map(n => n[0]).join('') : 'U'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-medical-900">
                              {patient.profile?.name || 'Unknown Patient'}
                            </h3>
                            <p className="text-caption text-medical-600">
                              {patient.profile?.age && `${patient.profile.age} years`} 
                              {patient.profile?.gender && patient.profile?.age && ' • '}
                              {patient.profile?.gender} 
                              {' • ID: ' + (patient._id?.slice(-6) || 'N/A')}
                            </p>
                          </div>
                          <div className="ml-4 flex items-center space-x-2">
                            {getStatusBadge(patient.status || 'active')}
                            {patient.riskLevel && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelBg(patient.riskLevel)} ${getRiskLevelColor(patient.riskLevel)}`}>
                                {patient.riskLevel.toUpperCase()} RISK
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-medical-600 mb-4">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            {patient.email || 'No email provided'}
                          </div>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            {patient.profile?.phone || 'No phone provided'}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {patient.profile?.address?.city || 'Address not provided'}
                          </div>
                          <div className="flex items-center">
                            <Heart className="w-4 h-4 mr-2" />
                            {patient.medicalCondition || 'General consultation'}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-medical-600">Last Visit:</span>
                              <span className="text-medical-900 font-medium ml-2">
                                {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'No visits yet'}
                              </span>
                            </div>
                            <div>
                              <span className="text-medical-600">Next Appointment:</span>
                              <span className="text-medical-900 font-medium ml-2">
                                {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString() : 'Not scheduled'}
                              </span>
                            </div>
                            <div>
                              <span className="text-medical-600">Total Consultations:</span>
                              <span className="text-medical-900 font-medium ml-2">{patient.totalConsultations || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row gap-2">
                        <button className="btn-primary">
                          <FileText className="w-4 h-4 mr-2" />
                          Medical Records
                        </button>
                        <button className="btn-accent">
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule
                        </button>
                        <button className="btn-outline">
                          <Phone className="w-4 h-4 mr-2" />
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-medical-900 mb-2">
                    {searchQuery || statusFilter !== 'all' || riskFilter !== 'all' ? 'No patients match your filters' : 'No patients found'}
                  </h3>
                  <p className="text-medical-600">
                    {searchQuery || statusFilter !== 'all' || riskFilter !== 'all' 
                      ? 'Try adjusting your search criteria or filters.' 
                      : 'Patients will appear here once they are assigned to you.'
                    }
                  </p>
                  {(searchQuery || statusFilter !== 'all' || riskFilter !== 'all') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('all')
                        setRiskFilter('all')
                      }}
                      className="btn-outline mt-4"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}