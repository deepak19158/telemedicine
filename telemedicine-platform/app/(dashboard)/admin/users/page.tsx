'use client'

import { useState } from 'react'
import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { useAdminUsers, useUpdateUserStatus, useUserAnalytics, useSearch, usePagination } from '../../../../lib/hooks/useApi'
import { 
  Users, 
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  Calendar,
  Activity,
  TrendingUp,
  AlertCircle,
  Eye,
  Edit,
  Shield,
  RefreshCw
} from 'lucide-react'

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useRequireRole('admin')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  
  // Search and pagination
  const { query, debouncedQuery, setQuery } = useSearch()
  const { page, limit, nextPage, prevPage, goToPage, params } = usePagination(1, 12)
  
  // Fetch data
  const queryParams = {
    ...params,
    search: debouncedQuery,
    role: selectedRole !== 'all' ? selectedRole : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined
  }
  
  console.log('🔍 Admin Users Page Debug - Query params:', queryParams)
  
  const { 
    data: usersData, 
    loading: usersLoading, 
    error: usersError,
    refetch: refetchUsers
  } = useAdminUsers(queryParams)

  const { data: analyticsData } = useUserAnalytics('30')
  
  // User status update mutation
  const { mutate: updateUserStatus, loading: updatingStatus } = useUpdateUserStatus()

  const isLoading = authLoading || usersLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  if (usersError) {
    return (
      <div className="min-h-screen bg-medical-gradient-soft flex items-center justify-center">
        <div className="card-medical text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h2 className="heading-secondary text-error-600 mb-2">Error Loading Users</h2>
          <p className="text-body mb-4">{usersError}</p>
          <button 
            className="btn-primary"
            onClick={() => refetchUsers()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const users = usersData?.data?.users || []
  const pagination = usersData?.data?.pagination || {}
  const analytics = analyticsData?.data?.stats || {}

  console.log('🔍 Admin Users Debug:', {
    usersData,
    users: users.length,
    pagination,
    analytics,
    hasUsersData: !!usersData,
    usersDataKeys: usersData ? Object.keys(usersData) : []
  })

  const handleStatusUpdate = async (userId: string, newStatus: boolean, reason?: string) => {
    try {
      await updateUserStatus({ userId, isActive: newStatus, reason })
      refetchUsers()
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700',
      doctor: 'bg-blue-100 text-blue-700',
      patient: 'bg-green-100 text-green-700',
      agent: 'bg-orange-100 text-orange-700'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || colors.patient}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">User Management</h1>
            <p className="text-body">Manage users, roles, and account status across the platform.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{analytics.totalUsers || 0}</div>
              <div className="text-caption">Total Users</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{analytics.activeUsers || 0}</div>
              <div className="text-caption">Active Users</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{analytics.newUsersThisMonth || 0}</div>
              <div className="text-caption">New This Month</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <UserX className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{analytics.inactiveUsers || 0}</div>
              <div className="text-caption">Inactive Users</div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="card-elevated mb-8">
            <div className="card-header">
              <h2 className="heading-secondary">Users</h2>
              <div className="flex space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-medical-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="input-primary pl-10"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                
                {/* Role Filter */}
                <select 
                  className="input-primary"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="patient">Patients</option>
                  <option value="doctor">Doctors</option>
                  <option value="agent">Agents</option>
                  <option value="admin">Admins</option>
                </select>
                
                {/* Status Filter */}
                <select 
                  className="input-primary"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.length > 0 ? (
                users.map((user: any) => (
                  <div key={user._id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <Users className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-medical-900">
                            {user.profile?.name || user.name || 'No Name'}
                          </h3>
                          <p className="text-caption text-medical-600">{user.email}</p>
                        </div>
                      </div>
                      <span className={`badge-${user.isActive ? 'success' : 'error'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-medical-600">Role:</span>
                        {getRoleBadge(user.role)}
                      </div>
                      
                      {user.profile?.phone && (
                        <div className="flex items-center text-sm text-medical-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {user.profile.phone}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-medical-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                      
                      {user.lastLoginAt && (
                        <div className="flex items-center text-sm text-medical-600">
                          <Activity className="w-4 h-4 mr-2" />
                          Last active {new Date(user.lastLoginAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        className="btn-outline text-xs flex-1"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </button>
                      
                      <button 
                        className={`text-xs flex-1 ${user.isActive ? 'btn-outline' : 'btn-accent'}`}
                        onClick={() => handleStatusUpdate(user._id, !user.isActive)}
                        disabled={updatingStatus}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Users className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-medical-900 mb-2">
                    {usersData ? 'No users found' : 'Loading users...'}
                  </h3>
                  <p className="text-medical-600">
                    {query 
                      ? 'Try adjusting your search or filters.' 
                      : usersData 
                        ? 'No users match your current filters. Try creating some users or adjusting your filters.'
                        : 'Please wait while we load the user data.'
                    }
                  </p>
                  {!usersData && (
                    <div className="mt-4">
                      <button 
                        onClick={() => refetchUsers()}
                        className="btn-primary"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-medical-200">
                <div className="text-sm text-medical-600">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.totalUsers)} of {pagination.totalUsers} users
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="btn-outline"
                    onClick={prevPage}
                    disabled={!pagination.hasPrevPage}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn-outline"
                    onClick={nextPage}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}