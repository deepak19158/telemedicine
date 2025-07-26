'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { TrendingUp, Users, DollarSign, Target, Calendar, Download, Filter } from 'lucide-react'

export default function AgentAnalytics() {
  const { user, isLoading } = useRequireRole('agent')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const monthlyData = [
    { month: 'Jan', referrals: 12, conversions: 8, revenue: 420 },
    { month: 'Feb', referrals: 15, conversions: 11, revenue: 580 },
    { month: 'Mar', referrals: 18, conversions: 12, revenue: 640 },
    { month: 'Apr', referrals: 22, conversions: 16, revenue: 890 },
    { month: 'May', referrals: 19, conversions: 13, revenue: 720 },
    { month: 'Jun', referrals: 25, conversions: 18, revenue: 1050 },
    { month: 'Jul', referrals: 14, conversions: 9, revenue: 520 }
  ]

  const performanceMetrics = {
    totalReferrals: 125,
    totalConversions: 87,
    totalRevenue: 4820,
    conversionRate: 69.6,
    avgCommissionPerReferral: 55.4,
    thisMonthGrowth: 15.2
  }

  const topPerformingCodes = [
    { code: 'AG001', conversions: 45, revenue: 2250, conversionRate: 75 },
    { code: 'AG001-SPECIAL', conversions: 28, revenue: 1680, conversionRate: 70 },
    { code: 'AG001-FAMILY', conversions: 14, revenue: 890, conversionRate: 82 }
  ]

  const referralSources = [
    { source: 'Social Media', percentage: 35, referrals: 44 },
    { source: 'Word of Mouth', percentage: 28, referrals: 35 },
    { source: 'Direct Sharing', percentage: 22, referrals: 27 },
    { source: 'Email Campaign', percentage: 15, referrals: 19 }
  ]

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Referral Analytics</h1>
            <p className="text-body">Analyze your referral performance and optimize your strategy.</p>
          </div>

          {/* Date Range Filter */}
          <div className="card-medical mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <h3 className="heading-tertiary mb-4 md:mb-0">Performance Overview</h3>
              <div className="flex space-x-2">
                <select className="input-primary">
                  <option>Last 6 Months</option>
                  <option>This Year</option>
                  <option>All Time</option>
                </select>
                <button className="btn-outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </button>
                <button className="btn-primary">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </button>
              </div>
            </div>
          </div>

          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{performanceMetrics.totalReferrals}</div>
              <div className="text-caption">Total Referrals</div>
              <div className="text-xs text-success-600 mt-1">+{performanceMetrics.thisMonthGrowth}% this month</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{performanceMetrics.conversionRate}%</div>
              <div className="text-caption">Conversion Rate</div>
              <div className="text-xs text-success-600 mt-1">{performanceMetrics.totalConversions} conversions</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${performanceMetrics.totalRevenue}</div>
              <div className="text-caption">Total Revenue</div>
              <div className="text-xs text-accent-600 mt-1">Lifetime earnings</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${performanceMetrics.avgCommissionPerReferral}</div>
              <div className="text-caption">Avg per Referral</div>
              <div className="text-xs text-warning-600 mt-1">Commission rate</div>
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Performance Trend */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Monthly Performance</h2>
                <button className="btn-outline text-xs">View Details</button>
              </div>
              <div className="space-y-4">
                {monthlyData.slice(-4).map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between p-4 bg-medical-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-primary-600">{month.month}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-medical-900">{month.referrals} referrals</div>
                        <div className="text-sm text-medical-600">{month.conversions} conversions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-medical-900">${month.revenue}</div>
                      <div className="text-xs text-success-600">
                        {Math.round((month.conversions / month.referrals) * 100)}% rate
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performing Codes */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Top Referral Codes</h2>
              </div>
              <div className="space-y-4">
                {topPerformingCodes.map((code, index) => (
                  <div key={code.code} className="p-4 bg-medical-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-primary-100' : index === 1 ? 'bg-accent-100' : 'bg-success-100'
                        }`}>
                          <span className={`font-semibold text-sm ${
                            index === 0 ? 'text-primary-600' : index === 1 ? 'text-accent-600' : 'text-success-600'
                          }`}>{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium text-medical-900">{code.code}</div>
                          <div className="text-sm text-medical-600">{code.conversions} conversions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-medical-900">${code.revenue}</div>
                        <div className="text-xs text-success-600">{code.conversionRate}% rate</div>
                      </div>
                    </div>
                    <div className="w-full bg-medical-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-primary-600' : index === 1 ? 'bg-accent-600' : 'bg-success-600'
                        }`} 
                        style={{ width: `${code.conversionRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Referral Sources and Performance Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Referral Sources */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Referral Sources</h2>
              </div>
              <div className="space-y-4">
                {referralSources.map((source, index) => (
                  <div key={source.source} className="flex items-center justify-between p-3 bg-medical-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-medical-900">{source.source}</div>
                        <div className="text-sm text-medical-600">{source.referrals} referrals</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-medical-900">{source.percentage}%</div>
                      <div className="w-16 bg-medical-200 rounded-full h-2 mt-1">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${source.percentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Insights */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Performance Insights</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-medical-900 mb-3">Best Performing Day</h4>
                  <div className="p-3 bg-success-50 rounded-lg">
                    <div className="font-medium text-success-700">Fridays</div>
                    <div className="text-sm text-success-600">23% higher conversion rate</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-medical-900 mb-3">Optimal Sharing Time</h4>
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <div className="font-medium text-primary-700">6:00 PM - 8:00 PM</div>
                    <div className="text-sm text-primary-600">Highest engagement window</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-medical-900 mb-3">Top Demographics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-medical-600">Age 25-35</span>
                      <span className="font-medium text-medical-900">42%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-medical-600">Age 35-45</span>
                      <span className="font-medium text-medical-900">31%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-medical-600">Age 45+</span>
                      <span className="font-medium text-medical-900">27%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Recommendations to Improve Performance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-medical-900 mb-2">Increase Social Media Presence</h4>
                <p className="text-sm text-medical-700">
                  Social media is your top referral source. Consider increasing your posting frequency and engagement.
                </p>
              </div>
              
              <div className="p-4 bg-accent-50 rounded-lg">
                <div className="w-8 h-8 bg-accent-600 rounded-lg flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-medical-900 mb-2">Optimize Timing</h4>
                <p className="text-sm text-medical-700">
                  Share referrals between 6-8 PM on Fridays for maximum conversion rates.
                </p>
              </div>
              
              <div className="p-4 bg-success-50 rounded-lg">
                <div className="w-8 h-8 bg-success-600 rounded-lg flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-medical-900 mb-2">Follow Up Strategy</h4>
                <p className="text-sm text-medical-700">
                  Implement a systematic follow-up approach for pending referrals to boost conversion rates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}