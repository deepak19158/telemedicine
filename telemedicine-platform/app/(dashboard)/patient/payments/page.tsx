'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { CreditCard, Download, Receipt, Calendar, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'

export default function PatientPayments() {
  const { user, isLoading } = useRequireRole('patient')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const paymentHistory = [
    {
      id: 'PAY-001',
      date: '2025-07-15',
      doctor: 'Dr. Sarah Johnson',
      service: 'General Consultation',
      amount: 75,
      method: 'Razorpay',
      status: 'completed',
      transactionId: 'RZP_TXN_12345',
      referralCode: 'AG001',
      discount: 10,
      finalAmount: 65
    },
    {
      id: 'PAY-002',
      date: '2025-07-10',
      doctor: 'Dr. Michael Chen',
      service: 'Cardiology Consultation',
      amount: 150,
      method: 'PayU',
      status: 'completed',
      transactionId: 'PU_TXN_67890',
      referralCode: null,
      discount: 0,
      finalAmount: 150
    },
    {
      id: 'PAY-003',
      date: '2025-07-08',
      doctor: 'Dr. Sarah Johnson',
      service: 'Follow-up Consultation',
      amount: 50,
      method: 'Cash via Agent',
      status: 'completed',
      transactionId: 'CASH_001',
      referralCode: 'AG001',
      discount: 5,
      finalAmount: 45
    },
    {
      id: 'PAY-004',
      date: '2025-07-20',
      doctor: 'Dr. Robert Smith',
      service: 'Specialist Consultation',
      amount: 200,
      method: 'Razorpay',
      status: 'pending',
      transactionId: 'RZP_TXN_PENDING',
      referralCode: null,
      discount: 0,
      finalAmount: 200
    }
  ]

  const paymentSummary = {
    totalSpent: 460,
    totalSaved: 15,
    completedPayments: 3,
    pendingPayments: 1
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center badge-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center badge-warning">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center badge-error">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        )
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Razorpay':
        return <CreditCard className="w-4 h-4 text-primary-600" />
      case 'PayU':
        return <CreditCard className="w-4 h-4 text-accent-600" />
      case 'Cash via Agent':
        return <DollarSign className="w-4 h-4 text-success-600" />
      default:
        return <CreditCard className="w-4 h-4 text-medical-600" />
    }
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Payment History</h1>
            <p className="text-body">Track your medical consultation payments and download receipts.</p>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${paymentSummary.totalSpent}</div>
              <div className="text-caption">Total Spent</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${paymentSummary.totalSaved}</div>
              <div className="text-caption">Total Saved</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{paymentSummary.completedPayments}</div>
              <div className="text-caption">Completed</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{paymentSummary.pendingPayments}</div>
              <div className="text-caption">Pending</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Download Statement</h3>
              <button className="btn-primary w-full">Generate PDF</button>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Payment Methods</h3>
              <button className="btn-accent w-full">Manage Cards</button>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Tax Documents</h3>
              <button className="btn-outline w-full">Download</button>
            </div>
          </div>

          {/* Payment History */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Transaction History</h2>
              <div className="flex space-x-2">
                <select className="input-primary">
                  <option>All Status</option>
                  <option>Completed</option>
                  <option>Pending</option>
                  <option>Failed</option>
                </select>
                <select className="input-primary">
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
                  <option>All Time</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                            {getMethodIcon(payment.method)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-medical-900">{payment.service}</h3>
                            <p className="text-caption text-medical-600">Payment ID: {payment.id}</p>
                          </div>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-medical-600 mb-3">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {payment.date}
                        </div>
                        <div className="flex items-center">
                          <Receipt className="w-4 h-4 mr-2" />
                          {payment.doctor}
                        </div>
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-2" />
                          {payment.method}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Transaction: {payment.transactionId}
                        </div>
                      </div>

                      {/* Payment Breakdown */}
                      <div className="bg-white rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-medical-600">Consultation Fee:</span>
                          <span className="text-medical-900 font-medium">${payment.amount}</span>
                        </div>
                        {payment.referralCode && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-medical-600">Referral Code ({payment.referralCode}):</span>
                              <span className="text-success-600 font-medium">-${payment.discount}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                              <span className="text-medical-900">Final Amount:</span>
                              <span className="text-medical-900">${payment.finalAmount}</span>
                            </div>
                          </>
                        )}
                        {!payment.referralCode && (
                          <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                            <span className="text-medical-900">Total Amount:</span>
                            <span className="text-medical-900">${payment.finalAmount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col sm:flex-row gap-2">
                      {payment.status === 'completed' && (
                        <>
                          <button className="btn-primary">
                            <Download className="w-4 h-4 mr-2" />
                            Receipt
                          </button>
                          <button className="btn-outline">
                            <Receipt className="w-4 h-4 mr-2" />
                            Invoice
                          </button>
                        </>
                      )}
                      {payment.status === 'pending' && (
                        <button className="btn-accent">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Complete Payment
                        </button>
                      )}
                      {payment.status === 'failed' && (
                        <button className="btn-secondary">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Retry Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}