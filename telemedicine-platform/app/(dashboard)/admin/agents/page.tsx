'use client'

import { useState } from 'react'
import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { useApi } from '../../../../lib/hooks/useApi'
import { apiClient } from '../../../../lib/api-client'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award,
  Search,
  Plus,
  Eye,
  Settings,
  Calendar,
  Mail,
  Phone,
  AlertCircle,
  Activity,
  CreditCard
} from 'lucide-react'

export default function AdminAgentsPage() {
  const { user, isLoading: authLoading } = useRequireRole('admin')
  const [activeTab, setActiveTab] = useState('agents')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [showCreateCodeModal, setShowCreateCodeModal] = useState(false)
  
  // Fetch agents
  const { 
    data: agentsData, 
    loading: agentsLoading, 
    error: agentsError,
    refetch: refetchAgents
  } = useApi(() => apiClient.get('/admin/agents', { 
    search: searchQuery,
    limit: '20' 
  }))

  // Fetch referral codes
  const { 
    data: codesData, 
    loading: codesLoading, 
    refetch: refetchCodes
  } = useApi(() => apiClient.get('/admin/agents/codes', { limit: '20' }))

  // Fetch agent analytics
  const { 
    data: analyticsData, 
    loading: analyticsLoading 
  } = useApi(() => apiClient.get('/admin/agents/analytics', { period: '30' }))

  const isLoading = authLoading || agentsLoading || analyticsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  if (agentsError) {
    return (
      <div className="min-h-screen bg-medical-gradient-soft flex items-center justify-center">
        <div className="card-medical text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h2 className="heading-secondary text-error-600 mb-2">Error Loading Agents</h2>
          <p className="text-body mb-4">{agentsError}</p>
          <button 
            className="btn-primary"
            onClick={() => refetchAgents()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const agents = agentsData?.data?.agents || []
  const analytics = analyticsData?.data || {}
  const referralCodes = codesData?.data?.codes || []

  const AgentCard = ({ agent }: { agent: any }) => (
    <div className="p-6 bg-medical-50 rounded-xl border border-medical-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-3">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-medical-900">
              {agent.profile?.name || agent.name}
            </h3>
            <p className="text-caption text-medical-600">{agent.email}</p>
          </div>
        </div>
        <span className={`badge-${agent.isActive ? 'success' : 'error'}`}>
          {agent.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-medical-900">{agent.stats?.totalCodes || 0}</div>
          <div className="text-xs text-medical-600">Referral Codes</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-medical-900">{agent.stats?.successfulReferrals || 0}</div>
          <div className="text-xs text-medical-600">Successful Referrals</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-medical-900">₹{agent.stats?.totalCommissions || 0}</div>
          <div className="text-xs text-medical-600">Total Commissions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-medical-900">{agent.stats?.activeCodes || 0}</div>
          <div className="text-xs text-medical-600">Active Codes</div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        {agent.profile?.phone && (
          <div className="flex items-center text-sm text-medical-600">
            <Phone className="w-4 h-4 mr-2" />
            {agent.profile.phone}
          </div>
        )}
        
        <div className="flex items-center text-sm text-medical-600">
          <Calendar className="w-4 h-4 mr-2" />
          Joined {new Date(agent.createdAt).toLocaleDateString()}
        </div>
        
        {agent.lastLoginAt && (
          <div className="flex items-center text-sm text-medical-600">
            <Activity className="w-4 h-4 mr-2" />
            Last active {new Date(agent.lastLoginAt).toLocaleDateString()}
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        <button 
          className="btn-outline text-xs flex-1"
          onClick={() => setSelectedAgent(agent)}
        >
          <Eye className="w-3 h-3 mr-1" />
          View Details
        </button>
        
        <button 
          className="btn-primary text-xs flex-1"
          onClick={() => {
            setSelectedAgent(agent)
            setShowCreateCodeModal(true)
          }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Assign Code
        </button>
      </div>
    </div>
  )

  const ReferralCodeCard = ({ code }: { code: any }) => (
    <div className="p-4 bg-medical-50 rounded-xl border border-medical-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-medical-900">{code.code}</h3>
          <p className="text-caption text-medical-600">
            Agent: {code.agentId?.profile?.name || code.agentId?.name}
          </p>
        </div>
        <span className={`badge-${code.isActive ? 'success' : 'error'}`}>
          {code.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-sm font-medium text-medical-900">
            {code.discountType === 'percentage' ? `${code.discountValue}% off` : `₹${code.discountValue} off`}
          </div>
          <div className="text-xs text-medical-600">Discount</div>
        </div>
        <div>
          <div className="text-sm font-medium text-medical-900">{code.usageCount}/{code.maxUsage}</div>
          <div className="text-xs text-medical-600">Usage</div>
        </div>
      </div>
      
      {code.expirationDate && (
        <div className="text-xs text-medical-600 mb-3">
          Expires: {new Date(code.expirationDate).toLocaleDateString()}
        </div>
      )}
      
      <button className="btn-outline text-xs w-full">
        <Settings className="w-3 h-3 mr-1" />
        Manage
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Agent Management</h1>
            <p className="text-body">Manage agents, referral codes, and track performance.</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{analytics.overview?.totalAgents || 0}</div>
              <div className="text-caption">Total Agents</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{analytics.referralCodes?.active || 0}</div>
              <div className="text-caption">Active Codes</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{analytics.referralCodes?.totalUsage || 0}</div>
              <div className="text-caption">Total Referrals</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">₹{analytics.commissions?.totalCommissions || 0}</div>
              <div className="text-caption">Total Commissions</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-medical-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'agents'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-medical-600 hover:text-medical-900'
                }`}
              >
                Agents ({agents.length})
              </button>
              <button
                onClick={() => setActiveTab('codes')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'codes'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-medical-600 hover:text-medical-900'
                }`}
              >
                Referral Codes ({referralCodes.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">
                {activeTab === 'agents' ? 'Agents' : 'Referral Codes'}
              </h2>
              <div className="flex space-x-4">
                {activeTab === 'agents' && (
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-medical-400" />
                    <input
                      type="text"
                      placeholder="Search agents..."
                      className="input-primary pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
                <button 
                  onClick={() => activeTab === 'agents' ? refetchAgents() : refetchCodes()}
                  className="btn-outline"
                >
                  Refresh
                </button>
                {activeTab === 'codes' && (
                  <button 
                    onClick={() => setShowCreateCodeModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Code
                  </button>
                )}
              </div>
            </div>

            {activeTab === 'agents' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.length > 0 ? (
                  agents.map((agent: any) => (
                    <AgentCard key={agent._id} agent={agent} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-medical-900 mb-2">No agents found</h3>
                    <p className="text-medical-600">
                      {searchQuery ? 'Try adjusting your search.' : 'No agents have registered yet.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {referralCodes.length > 0 ? (
                  referralCodes.map((code: any) => (
                    <ReferralCodeCard key={code._id} code={code} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <CreditCard className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-medical-900 mb-2">No referral codes found</h3>
                    <p className="text-medical-600">Create your first referral code to get started.</p>
                    <button 
                      onClick={() => setShowCreateCodeModal(true)}
                      className="btn-primary mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Referral Code
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}