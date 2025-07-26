'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { Settings, Link, Copy, Eye, Edit, Plus, Calendar, Users } from 'lucide-react'

export default function AgentCodes() {
  const { user, isLoading } = useRequireRole('agent')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const referralCodes = [
    {
      id: 1,
      code: 'AG001',
      type: 'percentage',
      discountValue: 15,
      usageCount: 23,
      maxUsage: 50,
      commissionRate: 60,
      expirationDate: '2025-12-31',
      status: 'active',
      createdDate: '2025-01-15',
      assignedBy: 'Admin',
      description: 'Standard referral code for general use'
    },
    {
      id: 2,
      code: 'AG001-SPECIAL',
      type: 'fixed',
      discountValue: 25,
      usageCount: 8,
      maxUsage: 20,
      commissionRate: 40,
      expirationDate: '2025-09-30',
      status: 'active',
      createdDate: '2025-06-01',
      assignedBy: 'Admin',
      description: 'Special promotion for new patients'
    },
    {
      id: 3,
      code: 'AG001-FAMILY',
      type: 'percentage',
      discountValue: 20,
      usageCount: 12,
      maxUsage: 30,
      commissionRate: 75,
      expirationDate: '2025-10-31',
      status: 'active',
      createdDate: '2025-05-15',
      assignedBy: 'Admin',
      description: 'Family and friends exclusive discount'
    },
    {
      id: 4,
      code: 'AG001-EXPIRED',
      type: 'percentage',
      discountValue: 10,
      usageCount: 15,
      maxUsage: 25,
      commissionRate: 50,
      expirationDate: '2025-06-30',
      status: 'expired',
      createdDate: '2025-03-01',
      assignedBy: 'Admin',
      description: 'Limited time offer (expired)'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge-success">Active</span>
      case 'expired':
        return <span className="badge-error">Expired</span>
      case 'paused':
        return <span className="badge-warning">Paused</span>
      case 'draft':
        return <span className="badge-info">Draft</span>
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const generateReferralLink = (code: string) => {
    return `https://medicarepro.com/referral/${code}`
  }

  const activeCodes = referralCodes.filter(code => code.status === 'active')
  const totalUsage = referralCodes.reduce((sum, code) => sum + code.usageCount, 0)
  const totalMaxUsage = referralCodes.reduce((sum, code) => sum + code.maxUsage, 0)

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Referral Code Management</h1>
            <p className="text-body">Manage your referral codes and track their performance.</p>
          </div>

          {/* Code Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Settings className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{activeCodes.length}</div>
              <div className="text-caption">Active Codes</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{totalUsage}</div>
              <div className="text-caption">Total Usage</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Link className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{totalMaxUsage}</div>
              <div className="text-caption">Total Capacity</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{Math.round((totalUsage / totalMaxUsage) * 100)}%</div>
              <div className="text-caption">Usage Rate</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-medical mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <h3 className="heading-tertiary mb-4 md:mb-0">Quick Actions</h3>
              <div className="flex space-x-2">
                <button className="btn-accent">
                  <Plus className="w-4 h-4 mr-2" />
                  Request New Code
                </button>
                <button className="btn-primary">
                  <Link className="w-4 h-4 mr-2" />
                  Share All Codes
                </button>
              </div>
            </div>
          </div>

          {/* Referral Codes List */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Your Referral Codes</h2>
              <select className="input-primary">
                <option>All Codes</option>
                <option>Active Only</option>
                <option>Expired</option>
                <option>High Usage</option>
              </select>
            </div>
            <div className="space-y-6">
              {referralCodes.map((code) => (
                <div key={code.id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Settings className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-medical-900 text-lg">{code.code}</h3>
                            <p className="text-caption text-medical-600">{code.description}</p>
                          </div>
                        </div>
                        {getStatusBadge(code.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-medical-600 mb-4">
                        <div>
                          <span className="font-medium">Discount:</span>
                          <div className="text-medical-900">
                            {code.type === 'percentage' ? `${code.discountValue}%` : `$${code.discountValue}`} off
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Commission Rate:</span>
                          <div className="text-medical-900">{code.commissionRate}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Usage:</span>
                          <div className="text-medical-900">{code.usageCount}/{code.maxUsage}</div>
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span>
                          <div className="text-medical-900">{code.expirationDate}</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-medical-900">Usage Progress</span>
                          <span className="text-xs text-medical-600">
                            {Math.round((code.usageCount / code.maxUsage) * 100)}% used
                          </span>
                        </div>
                        <div className="w-full bg-medical-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${
                              code.status === 'active' ? 'bg-primary-600' : 'bg-error-400'
                            }`}
                            style={{ width: `${(code.usageCount / code.maxUsage) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-medical-900">Referral Link:</span>
                            <div className="text-sm text-medical-600 break-all">
                              {generateReferralLink(code.code)}
                            </div>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(generateReferralLink(code.code))}
                            className="btn-outline text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col gap-2">
                      <button className="btn-primary">
                        <Link className="w-4 h-4 mr-2" />
                        Share Code
                      </button>
                      <button className="btn-outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View Analytics
                      </button>
                      {code.status === 'active' && (
                        <button className="btn-secondary">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Settings
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-medical-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-medical-500">
                      <div>
                        <strong>Created:</strong> {code.createdDate}
                      </div>
                      <div>
                        <strong>Assigned by:</strong> {code.assignedBy}
                      </div>
                      <div>
                        <strong>Code ID:</strong> #{code.id}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Request Form */}
          <div className="mt-8 card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Request New Referral Code</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Requested Code Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., AG001-SUMMER"
                    className="input-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Discount Type
                  </label>
                  <select className="input-primary">
                    <option>Percentage</option>
                    <option>Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Suggested Discount Value
                  </label>
                  <input
                    type="number"
                    placeholder="15"
                    className="input-primary"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Expected Usage Limit
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    className="input-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Requested Expiration Date
                  </label>
                  <input
                    type="date"
                    className="input-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-2">
                    Purpose/Description
                  </label>
                  <textarea
                    placeholder="Describe the purpose of this referral code..."
                    className="input-primary"
                    rows={3}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-medical-200">
              <div className="flex justify-end space-x-4">
                <button className="btn-outline">Cancel</button>
                <button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}