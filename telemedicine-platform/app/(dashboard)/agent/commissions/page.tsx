'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { DollarSign, TrendingUp, Calendar, Download, Eye, CreditCard } from 'lucide-react'

export default function AgentCommissions() {
  const { user, isLoading } = useRequireRole('agent')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const commissionHistory = [
    {
      id: 'COM-001',
      date: '2025-07-19',
      patientName: 'John Smith',
      referralCode: 'AG001-REF-001',
      consultationFee: 75,
      discountAmount: 11.25,
      commissionRate: 60,
      commissionAmount: 45,
      status: 'paid',
      paymentDate: '2025-07-20'
    },
    {
      id: 'COM-002',
      date: '2025-07-17',
      patientName: 'Michael Brown',
      referralCode: 'AG001-REF-003',
      consultationFee: 150,
      discountAmount: 22.5,
      commissionRate: 40,
      commissionAmount: 60,
      status: 'paid',
      paymentDate: '2025-07-18'
    },
    {
      id: 'COM-003',
      date: '2025-07-15',
      patientName: 'Robert Johnson',
      referralCode: 'AG001-REF-005',
      consultationFee: 50,
      discountAmount: 7.5,
      commissionRate: 75,
      commissionAmount: 37.5,
      status: 'pending',
      paymentDate: null
    },
    {
      id: 'COM-004',
      date: '2025-07-12',
      patientName: 'Lisa Anderson',
      referralCode: 'AG001-REF-006',
      consultationFee: 100,
      discountAmount: 15,
      commissionRate: 50,
      commissionAmount: 50,
      status: 'paid',
      paymentDate: '2025-07-13'
    }
  ]

  const monthlyStats = {
    totalEarnings: 192.5,
    pendingPayments: 37.5,
    paidCommissions: 155,
    totalReferrals: 4,
    avgCommissionRate: 56.25
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge-success">Paid</span>
      case 'pending':
        return <span className="badge-warning">Pending</span>
      case 'processing':
        return <span className="badge-info">Processing</span>
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
            <h1 className="heading-primary mb-2">Commission Tracking</h1>
            <p className="text-body">Monitor your commission earnings and payment history.</p>
          </div>

          {/* Commission Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${monthlyStats.totalEarnings}</div>
              <div className="text-caption">Total Earnings</div>
              <div className="text-xs text-success-600 mt-1">This month</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${monthlyStats.paidCommissions}</div>
              <div className="text-caption">Paid Out</div>
              <div className="text-xs text-primary-600 mt-1">Available in account</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${monthlyStats.pendingPayments}</div>
              <div className="text-caption">Pending</div>
              <div className="text-xs text-warning-600 mt-1">Processing payment</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{monthlyStats.avgCommissionRate}%</div>
              <div className="text-caption">Avg Commission Rate</div>
              <div className="text-xs text-accent-600 mt-1">Performance based</div>
            </div>
          </div>

          {/* Commission Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="card-elevated">
                <div className="card-header">
                  <h2 className="heading-secondary">Commission History</h2>
                  <div className="flex space-x-2">
                    <select className="input-primary">
                      <option>This Month</option>
                      <option>Last 3 Months</option>
                      <option>Last 6 Months</option>
                      <option>All Time</option>
                    </select>
                    <button className="btn-primary">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {commissionHistory.map((commission) => (
                    <div key={commission.id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center mr-3">
                                <DollarSign className="w-5 h-5 text-success-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-medical-900">{commission.patientName}</h3>
                                <p className="text-caption text-medical-600">Commission ID: {commission.id}</p>
                              </div>
                            </div>
                            {getStatusBadge(commission.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-medical-600 mb-4">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              Date: {commission.date}
                            </div>
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-2" />
                              Referral: {commission.referralCode}
                            </div>
                            {commission.paymentDate && (
                              <div className="flex items-center">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Paid: {commission.paymentDate}
                              </div>
                            )}
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <h4 className="font-medium text-medical-900 mb-3">Commission Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-medical-600">Consultation Fee:</span>
                                <div className="font-medium text-medical-900">${commission.consultationFee}</div>
                              </div>
                              <div>
                                <span className="text-medical-600">Discount Given:</span>
                                <div className="font-medium text-medical-900">${commission.discountAmount}</div>
                              </div>
                              <div>
                                <span className="text-medical-600">Commission Rate:</span>
                                <div className="font-medium text-medical-900">{commission.commissionRate}%</div>
                              </div>
                              <div>
                                <span className="text-medical-600">Your Commission:</span>
                                <div className="font-medium text-success-600">${commission.commissionAmount}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row gap-2">
                          <button className="btn-primary">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </button>
                          {commission.status === 'paid' && (
                            <button className="btn-outline">
                              <Download className="w-4 h-4 mr-2" />
                              Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment Information */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Payment Information</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-lg border border-medical-200">
                    <div className="font-medium text-medical-900 mb-1">Payment Method</div>
                    <div className="text-sm text-medical-600">Bank Transfer</div>
                    <div className="text-xs text-medical-500">****1234</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-medical-200">
                    <div className="font-medium text-medical-900 mb-1">Payment Schedule</div>
                    <div className="text-sm text-medical-600">Monthly</div>
                    <div className="text-xs text-medical-500">1st of each month</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-medical-200">
                    <div className="font-medium text-medical-900 mb-1">Next Payment</div>
                    <div className="text-sm text-medical-600">August 1, 2025</div>
                    <div className="text-xs text-success-500">$37.50 pending</div>
                  </div>
                </div>
                <button className="btn-primary w-full mt-4">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Update Payment Info
                </button>
              </div>

              {/* Commission Structure */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Commission Structure</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <div className="font-medium text-medical-900 mb-1">Standard Rate</div>
                    <div className="text-sm text-medical-700">40-60% of discount value</div>
                  </div>
                  <div className="p-3 bg-accent-50 rounded-lg">
                    <div className="font-medium text-medical-900 mb-1">Performance Bonus</div>
                    <div className="text-sm text-medical-700">+15% for 20+ monthly referrals</div>
                  </div>
                  <div className="p-3 bg-success-50 rounded-lg">
                    <div className="font-medium text-medical-900 mb-1">Special Campaigns</div>
                    <div className="text-sm text-medical-700">Up to 75% for targeted referrals</div>
                  </div>
                </div>
              </div>

              {/* Monthly Summary */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">This Month Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Referrals Converted</span>
                    <span className="text-sm font-medium text-medical-900">{monthlyStats.totalReferrals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Total Commissions</span>
                    <span className="text-sm font-medium text-medical-900">${monthlyStats.totalEarnings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Avg per Referral</span>
                    <span className="text-sm font-medium text-medical-900">${(monthlyStats.totalEarnings / monthlyStats.totalReferrals).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-medical-200">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-medical-900">Net Earnings</span>
                      <span className="text-sm font-bold text-success-600">${monthlyStats.totalEarnings}</span>
                    </div>
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