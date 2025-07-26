'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { Users, Search, Eye, Calendar, DollarSign, TrendingUp, Filter } from 'lucide-react'

export default function AgentReferrals() {
  const { user, isLoading } = useRequireRole('agent')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const referrals = [
    {
      id: 1,
      patientName: 'John Smith',
      patientEmail: 'john.smith@email.com',
      code: 'AG001-REF-001',
      referredDate: '2025-07-19',
      status: 'converted',
      commission: 45,
      appointmentDate: '2025-07-20',
      doctor: 'Dr. Sarah Johnson',
      consultationFee: 75,
      discount: 15
    },
    {
      id: 2,
      patientName: 'Sarah Wilson',
      patientEmail: 'sarah.wilson@email.com',
      code: 'AG001-REF-002',
      referredDate: '2025-07-18',
      status: 'pending',
      commission: 0,
      appointmentDate: null,
      doctor: null,
      consultationFee: 0,
      discount: 15
    },
    {
      id: 3,
      patientName: 'Michael Brown',
      patientEmail: 'michael.brown@email.com',
      code: 'AG001-REF-003',
      referredDate: '2025-07-17',
      status: 'converted',
      commission: 60,
      appointmentDate: '2025-07-18',
      doctor: 'Dr. Michael Chen',
      consultationFee: 150,
      discount: 15
    },
    {
      id: 4,
      patientName: 'Emma Davis',
      patientEmail: 'emma.davis@email.com',
      code: 'AG001-REF-004',
      referredDate: '2025-07-16',
      status: 'expired',
      commission: 0,
      appointmentDate: null,
      doctor: null,
      consultationFee: 0,
      discount: 15
    },
    {
      id: 5,
      patientName: 'Robert Johnson',
      patientEmail: 'robert.johnson@email.com',
      code: 'AG001-REF-005',
      referredDate: '2025-07-15',
      status: 'converted',
      commission: 37.5,
      appointmentDate: '2025-07-16',
      doctor: 'Dr. Sarah Johnson',
      consultationFee: 50,
      discount: 15
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'converted':
        return <span className="badge-success">Converted</span>
      case 'pending':
        return <span className="badge-warning">Pending</span>
      case 'expired':
        return <span className="badge-error">Expired</span>
      case 'cancelled':
        return <span className="badge-info">Cancelled</span>
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  const totalCommissions = referrals.reduce((sum, ref) => sum + ref.commission, 0)
  const convertedReferrals = referrals.filter(ref => ref.status === 'converted').length
  const pendingReferrals = referrals.filter(ref => ref.status === 'pending').length
  const conversionRate = Math.round((convertedReferrals / referrals.length) * 100)

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Referral Management</h1>
            <p className="text-body">Track and manage all your patient referrals and their status.</p>
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{referrals.length}</div>
              <div className="text-caption">Total Referrals</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{convertedReferrals}</div>
              <div className="text-caption">Converted</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{pendingReferrals}</div>
              <div className="text-caption">Pending</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${totalCommissions}</div>
              <div className="text-caption">Total Earned</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card-elevated mb-8">
            <div className="card-header">
              <h2 className="heading-secondary">Search Referrals</h2>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-medical-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by patient name, email, or referral code..."
                    className="input-primary pl-10 w-full"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <select className="input-primary">
                  <option>All Status</option>
                  <option>Converted</option>
                  <option>Pending</option>
                  <option>Expired</option>
                  <option>Cancelled</option>
                </select>
                <select className="input-primary">
                  <option>Last 30 Days</option>
                  <option>Last 3 Months</option>
                  <option>Last 6 Months</option>
                  <option>All Time</option>
                </select>
                <button className="btn-primary">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Referrals List */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">All Referrals</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-medical-600">Conversion Rate: {conversionRate}%</span>
                <button className="btn-outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-primary-600 font-semibold">
                            {referral.patientName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-medical-900">{referral.patientName}</h3>
                          <p className="text-caption text-medical-600">{referral.patientEmail}</p>
                          <p className="text-xs text-medical-500">Referral Code: {referral.code}</p>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(referral.status)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-medical-600 mb-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Referred: {referral.referredDate}
                        </div>
                        {referral.appointmentDate && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Appointment: {referral.appointmentDate}
                          </div>
                        )}
                        {referral.doctor && (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {referral.doctor}
                          </div>
                        )}
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Commission: ${referral.commission}
                        </div>
                      </div>

                      {referral.status === 'converted' && (
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-medical-900 mb-2">Commission Breakdown</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-medical-600">Consultation Fee:</span>
                              <span className="text-medical-900 font-medium ml-2">${referral.consultationFee}</span>
                            </div>
                            <div>
                              <span className="text-medical-600">Discount Applied:</span>
                              <span className="text-medical-900 font-medium ml-2">{referral.discount}%</span>
                            </div>
                            <div>
                              <span className="text-medical-600">Your Commission:</span>
                              <span className="text-success-600 font-medium ml-2">${referral.commission}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {referral.status === 'pending' && (
                        <div className="bg-warning-50 rounded-lg p-4">
                          <p className="text-sm text-warning-700">
                            <strong>Pending:</strong> Patient has not yet completed their appointment booking. 
                            Consider following up to improve conversion.
                          </p>
                        </div>
                      )}
                      
                      {referral.status === 'expired' && (
                        <div className="bg-error-50 rounded-lg p-4">
                          <p className="text-sm text-error-700">
                            <strong>Expired:</strong> Referral code has expired without conversion. 
                            You can reach out to offer a new referral.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row gap-2">
                      <button className="btn-primary">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                      {referral.status === 'pending' && (
                        <button className="btn-accent">Follow Up</button>
                      )}
                      {referral.status === 'converted' && (
                        <button className="btn-outline">View Receipt</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-medical-600">
                Showing {referrals.length} of {referrals.length} referrals
              </div>
              <div className="flex space-x-2">
                <button className="btn-outline text-sm" disabled>Previous</button>
                <button className="btn-primary text-sm">1</button>
                <button className="btn-outline text-sm" disabled>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}