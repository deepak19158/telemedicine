'use client'

import { useState } from 'react'
import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { useApi } from '../../../../lib/hooks/useApi'
import { apiClient } from '../../../../lib/api-client'
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  Activity,
  UserCheck,
  Stethoscope,
  Award,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

export default function AdminAnalyticsPage() {
  const { user, isLoading: authLoading } = useRequireRole('admin')
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  
  // Fetch platform analytics
  const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics
  } = useApi(() => apiClient.get('/admin/analytics', { period: selectedPeriod }))

  const isLoading = authLoading || analyticsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  if (analyticsError) {
    return (
      <div className="min-h-screen bg-medical-gradient-soft flex items-center justify-center">
        <div className="card-medical text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h2 className="heading-secondary text-error-600 mb-2">Error Loading Analytics</h2>
          <p className="text-body mb-4">{analyticsError}</p>
          <button 
            className="btn-primary"
            onClick={() => refetchAnalytics()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const analytics = analyticsData?.data || {}
  const {
    overview = {},
    appointments = {},
    revenue = {},
    doctors = {},
    referralProgram = {},
    performance = {},
    trends = {}
  } = analytics

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = 'primary',
    change 
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: any
    color?: string
    change?: string
  }) => (
    <div className="card-medical text-center">
      <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center mx-auto mb-3`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
      <div className="text-2xl font-bold text-medical-900 mb-1">{value}</div>
      <div className="text-caption">{title}</div>
      {subtitle && (
        <div className="text-xs text-medical-500 mt-1">{subtitle}</div>
      )}
      {change && (
        <div className={`text-xs mt-1 ${change.startsWith('+') ? 'text-success-600' : 'text-error-600'}`}>
          {change}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="heading-primary mb-2">Platform Analytics</h1>
                <p className="text-body">Comprehensive insights into platform performance and growth.</p>
              </div>
              <div className="flex space-x-4">
                <select 
                  className="input-primary"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
                <button 
                  onClick={() => refetchAnalytics()}
                  className="btn-outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
                <button className="btn-primary">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Overview Metrics */}
          <div className="mb-8">
            <h2 className="heading-secondary mb-6">Platform Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Users"
                value={overview.totalUsers || 0}
                icon={Users}
                color="primary"
                change={overview.growthRate ? `+${overview.growthRate}%` : undefined}
              />
              <MetricCard
                title="Active Users"
                value={overview.activeUsers || 0}
                subtitle={`${overview.inactiveUsers || 0} inactive`}
                icon={UserCheck}
                color="success"
              />
              <MetricCard
                title="Total Revenue"
                value={`₹${revenue.totalRevenue?.toLocaleString() || 0}`}
                subtitle={`₹${revenue.revenueInPeriod?.toLocaleString() || 0} this period`}
                icon={DollarSign}
                color="warning"
              />
              <MetricCard
                title="Appointments"
                value={appointments.total || 0}
                subtitle={`${appointments.completionRate || 0}% completion rate`}
                icon={Calendar}
                color="accent"
              />
            </div>
          </div>

          {/* User Breakdown */}
          <div className="mb-8">
            <h2 className="heading-secondary mb-6">User Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Patients"
                value={overview.totalPatients || 0}
                icon={Users}
                color="primary"
              />
              <MetricCard
                title="Doctors"
                value={overview.totalDoctors || 0}
                subtitle={`${doctors.approved || 0} approved, ${doctors.pending || 0} pending`}
                icon={Stethoscope}
                color="accent"
              />
              <MetricCard
                title="Agents"
                value={overview.totalAgents || 0}
                icon={Award}
                color="warning"
              />
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Appointment Analytics */}
            <div className="card-elevated">
              <div className="card-header">
                <h3 className="heading-tertiary">Appointment Analytics</h3>
                <BarChart3 className="w-5 h-5 text-medical-400" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Total Appointments</span>
                  <span className="font-semibold text-medical-900">{appointments.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Completed</span>
                  <span className="font-semibold text-success-600">{appointments.completed || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Scheduled</span>
                  <span className="font-semibold text-primary-600">{appointments.scheduled || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Cancelled</span>
                  <span className="font-semibold text-error-600">{appointments.cancelled || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-medical-200">
                  <span className="text-medical-600">Completion Rate</span>
                  <span className="font-semibold text-medical-900">{appointments.completionRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Cancellation Rate</span>
                  <span className="font-semibold text-medical-900">{performance.cancellationRate || 0}%</span>
                </div>
              </div>
            </div>

            {/* Doctor Performance */}
            <div className="card-elevated">
              <div className="card-header">
                <h3 className="heading-tertiary">Doctor Performance</h3>
                <Stethoscope className="w-5 h-5 text-medical-400" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Approved Doctors</span>
                  <span className="font-semibold text-success-600">{doctors.approved || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Pending Approval</span>
                  <span className="font-semibold text-warning-600">{doctors.pending || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Rejected</span>
                  <span className="font-semibold text-error-600">{doctors.rejected || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-medical-200">
                  <span className="text-medical-600">Approval Rate</span>
                  <span className="font-semibold text-medical-900">{doctors.approvalRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Avg Consultations/Doctor</span>
                  <span className="font-semibold text-medical-900">{doctors.avgConsultationsPerDoctor?.toFixed(1) || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-medical-600">Avg Consultation Fee</span>
                  <span className="font-semibold text-medical-900">₹{revenue.averageConsultationFee?.toFixed(0) || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Program Analytics */}
          <div className="mb-8">
            <div className="card-elevated">
              <div className="card-header">
                <h3 className="heading-tertiary">Referral Program Performance</h3>
                <Award className="w-5 h-5 text-medical-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-900 mb-1">{referralProgram.totalCodes || 0}</div>
                  <div className="text-caption">Total Codes</div>
                  <div className="text-xs text-medical-500 mt-1">{referralProgram.activeCodes || 0} active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-900 mb-1">{referralProgram.totalUsage || 0}</div>
                  <div className="text-caption">Total Usage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-900 mb-1">{referralProgram.referralAppointments || 0}</div>
                  <div className="text-caption">Referral Appointments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-medical-900 mb-1">₹{referralProgram.totalCommissions?.toLocaleString() || 0}</div>
                  <div className="text-caption">Total Commissions</div>
                  <div className="text-xs text-medical-500 mt-1">{referralProgram.conversionRate || 0}% conversion</div>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Consultation Types */}
          {performance.consultationTypes && performance.consultationTypes.length > 0 && (
            <div className="card-elevated">
              <div className="card-header">
                <h3 className="heading-tertiary">Popular Consultation Types</h3>
                <PieChart className="w-5 h-5 text-medical-400" />
              </div>
              <div className="space-y-3">
                {performance.consultationTypes.map((type: any, index: number) => (
                  <div key={type._id} className="flex justify-between items-center">
                    <span className="text-medical-600 capitalize">{type._id || 'Unknown'}</span>
                    <span className="font-semibold text-medical-900">{type.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}