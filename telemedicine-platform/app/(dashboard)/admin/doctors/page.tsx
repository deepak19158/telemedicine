'use client'

import { useState } from 'react'
import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { usePendingDoctors, useApproveDoctor, useAdminUsers } from '../../../../lib/hooks/useApi'
import { 
  UserCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Stethoscope,
  Calendar,
  Mail,
  Phone,
  Award,
  MapPin,
  Eye,
  FileText
} from 'lucide-react'

export default function AdminDoctorsPage() {
  const { user, isLoading: authLoading } = useRequireRole('admin')
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [approvalReason, setApprovalReason] = useState('')
  
  // Fetch pending doctors
  const { 
    data: pendingData, 
    loading: pendingLoading, 
    error: pendingError,
    refetch: refetchPending
  } = usePendingDoctors({ limit: '20' })

  // Fetch all doctors
  const { 
    data: doctorsData, 
    loading: doctorsLoading, 
    refetch: refetchDoctors
  } = useAdminUsers({ role: 'doctor', limit: '20' })
  
  // Doctor approval mutation
  const { mutate: approveDoctor, loading: approvingDoctor } = useApproveDoctor()

  const isLoading = authLoading || (activeTab === 'pending' ? pendingLoading : doctorsLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const pendingDoctors = pendingData?.doctors || []
  const allDoctors = doctorsData?.users || []
  const stats = pendingData?.stats || {}

  const handleDoctorAction = async (doctorId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      await approveDoctor({ 
        doctorId, 
        action, 
        reason, 
        assignPatients: action === 'approve' 
      })
      refetchPending()
      refetchDoctors()
      setSelectedDoctor(null)
      setApprovalReason('')
    } catch (error) {
      console.error('Failed to process doctor action:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="badge-success">Approved</span>
      case 'pending':
        return <span className="badge-warning">Pending</span>
      case 'rejected':
        return <span className="badge-error">Rejected</span>
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  const DoctorCard = ({ doctor, isPending = false }: { doctor: any; isPending?: boolean }) => (
    <div className="p-6 bg-medical-50 rounded-xl border border-medical-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3">
            <Stethoscope className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-medical-900">
              Dr. {doctor.profile?.name || doctor.name}
            </h3>
            <p className="text-caption text-medical-600">{doctor.email}</p>
          </div>
        </div>
        {getStatusBadge(doctor.registrationStatus || 'pending')}
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-medical-600">
          <Award className="w-4 h-4 mr-2" />
          {doctor.profile?.specialization || 'General Medicine'}
        </div>
        
        {doctor.profile?.licenseNumber && (
          <div className="flex items-center text-sm text-medical-600">
            <FileText className="w-4 h-4 mr-2" />
            License: {doctor.profile.licenseNumber}
          </div>
        )}
        
        {doctor.profile?.phone && (
          <div className="flex items-center text-sm text-medical-600">
            <Phone className="w-4 h-4 mr-2" />
            {doctor.profile.phone}
          </div>
        )}
        
        {doctor.profile?.address?.city && (
          <div className="flex items-center text-sm text-medical-600">
            <MapPin className="w-4 h-4 mr-2" />
            {doctor.profile.address.city}, {doctor.profile.address.state}
          </div>
        )}
        
        <div className="flex items-center text-sm text-medical-600">
          <Calendar className="w-4 h-4 mr-2" />
          Applied {new Date(doctor.createdAt).toLocaleDateString()}
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button 
          className="btn-outline text-xs flex-1"
          onClick={() => setSelectedDoctor(doctor)}
        >
          <Eye className="w-3 h-3 mr-1" />
          View Details
        </button>
        
        {isPending && (
          <>
            <button 
              className="btn-accent text-xs flex-1"
              onClick={() => handleDoctorAction(doctor._id, 'approve')}
              disabled={approvingDoctor}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </button>
            <button 
              className="btn-outline text-xs flex-1"
              onClick={() => handleDoctorAction(doctor._id, 'reject', 'Does not meet requirements')}
              disabled={approvingDoctor}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Doctor Management</h1>
            <p className="text-body">Manage doctor registrations, approvals, and profiles.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.pendingCount || 0}</div>
              <div className="text-caption">Pending Approval</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.approvedCount || 0}</div>
              <div className="text-caption">Approved</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-error-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-6 h-6 text-error-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.rejectedCount || 0}</div>
              <div className="text-caption">Rejected</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.totalDoctors || 0}</div>
              <div className="text-caption">Total Doctors</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-medical-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-medical-600 hover:text-medical-900'
                }`}
              >
                Pending Approval ({pendingDoctors.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-medical-600 hover:text-medical-900'
                }`}
              >
                All Doctors ({allDoctors.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">
                {activeTab === 'pending' ? 'Pending Doctor Approvals' : 'All Doctors'}
              </h2>
              <button 
                onClick={() => activeTab === 'pending' ? refetchPending() : refetchDoctors()}
                className="btn-outline"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === 'pending' ? (
                pendingDoctors.length > 0 ? (
                  pendingDoctors.map((doctor: any) => (
                    <DoctorCard key={doctor._id} doctor={doctor} isPending={true} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <CheckCircle className="w-16 h-16 text-success-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-medical-900 mb-2">No pending approvals</h3>
                    <p className="text-medical-600">All doctor applications have been reviewed.</p>
                  </div>
                )
              ) : (
                allDoctors.length > 0 ? (
                  allDoctors.map((doctor: any) => (
                    <DoctorCard key={doctor._id} doctor={doctor} isPending={false} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Stethoscope className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-medical-900 mb-2">No doctors found</h3>
                    <p className="text-medical-600">No doctors have registered yet.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}