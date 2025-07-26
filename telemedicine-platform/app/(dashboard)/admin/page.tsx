'use client'

import { useRequireRole } from '../../../lib/hooks/useAuth'
import { useAdminUsers, useUserAnalytics, usePendingDoctors, useApproveDoctor } from '../../../lib/hooks/useApi'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui'
import { 
  Users, 
  UserCheck, 
  Activity, 
  TrendingUp, 
  Clock, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FileText,
  Settings
} from 'lucide-react'
import { useState } from 'react'

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useRequireRole('admin')
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  
  // Fetch admin data
  const { data: usersData, loading: usersLoading } = useAdminUsers({ limit: '10' })
  const { data: analyticsData, loading: analyticsLoading } = useUserAnalytics(selectedPeriod)
  const { data: pendingDoctorsData, loading: pendingLoading } = usePendingDoctors({ limit: '5' })
  const { mutate: approveDoctor } = useApproveDoctor()

  const isLoading = authLoading || usersLoading || analyticsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const stats = analyticsData?.stats || {
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAgents: 0,
    activeUsers: 0,
    pendingDoctors: 0,
    totalAppointments: 0,
    totalRevenue: 0
  }

  const pendingDoctors = pendingDoctorsData?.doctors || []
  const recentUsers = usersData?.users || []

  const handleDoctorApproval = async (doctorId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      await approveDoctor({ doctorId, action, reason, assignPatients: action === 'approve' })
      // Refresh the pending doctors list
    } catch (error) {
      console.error('Failed to process doctor approval:', error)
    }
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">
              Admin Dashboard
            </h1>
            <p className="text-body">
              Welcome back, {user?.name}. Manage your telemedicine platform from here.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.totalUsers}</div>
              <div className="text-caption">Total Users</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.totalDoctors}</div>
              <div className="text-caption">Doctors</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.activeUsers}</div>
              <div className="text-caption">Active Users</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{stats.pendingDoctors}</div>
              <div className="text-caption">Pending Approvals</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pending Doctor Approvals */}
            <div className="lg:col-span-2">
              <div className="card-elevated">
                <div className="card-header">
                  <h2 className="heading-secondary">Pending Doctor Approvals</h2>
                  <span className="badge-warning">{pendingDoctors.length} Pending</span>
                </div>
                <div className="space-y-4">
                  {pendingDoctors.length > 0 ? (
                    pendingDoctors.map((doctor: any) => (
                      <div key={doctor._id} className="p-4 bg-medical-50 rounded-xl border border-medical-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                              <UserCheck className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-medical-900">
                                Dr. {doctor.profile?.name || doctor.name}
                              </h3>
                              <p className="text-caption text-medical-600">
                                {doctor.profile?.specialization || 'General Medicine'}
                              </p>
                              <p className="text-xs text-medical-500">
                                Applied: {new Date(doctor.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleDoctorApproval(doctor._id, 'approve')}
                              className="btn-accent text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleDoctorApproval(doctor._id, 'reject', 'Application does not meet requirements')}
                              className="btn-outline text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </button>
                          </div>
                        </div>
                        {doctor.profile?.licenseNumber && (
                          <div className="mt-2 text-xs text-medical-600">
                            <strong>License:</strong> {doctor.profile.licenseNumber}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-success-300 mx-auto mb-3" />
                      <p className="text-medical-600">No pending doctor approvals</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="btn-primary w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </button>
                  <button className="btn-accent w-full">
                    <Shield className="w-4 h-4 mr-2" />
                    System Settings
                  </button>
                  <button className="btn-outline w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </button>
                </div>
              </div>

              {/* Recent Users */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {recentUsers.slice(0, 5).map((user: any) => (
                    <div key={user._id} className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-medical-900">
                          {user.profile?.name || user.name}
                        </p>
                        <p className="text-xs text-medical-600">
                          {user.role} • {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`badge-${user.isActive ? 'success' : 'error'} text-xs`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Stats */}
              <div className="card-medical">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="heading-tertiary">Platform Stats</h3>
                  <select 
                    className="text-xs border rounded px-2 py-1"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Appointments</span>
                    <span className="text-sm font-medium text-medical-900">
                      {stats.totalAppointments}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Revenue</span>
                    <span className="text-sm font-medium text-medical-900">
                      ₹{stats.totalRevenue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Patients</span>
                    <span className="text-sm font-medium text-medical-900">
                      {stats.totalPatients}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Agents</span>
                    <span className="text-sm font-medium text-medical-900">
                      {stats.totalAgents}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}