'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { TrendingUp, DollarSign, Users, Calendar, Clock, Star, Download, Filter } from 'lucide-react'

export default function DoctorAnalytics() {
  const { user, isLoading } = useRequireRole('doctor')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const monthlyData = [
    { month: 'Jan', appointments: 45, revenue: 3375, avgRating: 4.7 },
    { month: 'Feb', appointments: 52, revenue: 3900, avgRating: 4.8 },
    { month: 'Mar', appointments: 48, revenue: 3600, avgRating: 4.6 },
    { month: 'Apr', appointments: 61, revenue: 4575, avgRating: 4.9 },
    { month: 'May', appointments: 58, revenue: 4350, avgRating: 4.8 },
    { month: 'Jun', appointments: 65, revenue: 4875, avgRating: 4.9 },
    { month: 'Jul', appointments: 32, revenue: 2400, avgRating: 4.8 }
  ]

  const currentMonthStats = {
    totalAppointments: 32,
    totalRevenue: 2400,
    avgRating: 4.8,
    responseTime: '< 5 min',
    completionRate: 96,
    newPatients: 8,
    returningPatients: 24
  }

  const topConditions = [
    { condition: 'Hypertension', count: 12, percentage: 37.5 },
    { condition: 'Diabetes Type 2', count: 8, percentage: 25 },
    { condition: 'General Wellness', count: 6, percentage: 18.75 },
    { condition: 'Cardiac Monitoring', count: 4, percentage: 12.5 },
    { condition: 'Chronic Pain', count: 2, percentage: 6.25 }
  ]

  const appointmentTypes = [
    { type: 'Video Consultation', count: 24, percentage: 75 },
    { type: 'Phone Consultation', count: 6, percentage: 18.75 },
    { type: 'Follow-up', count: 2, percentage: 6.25 }
  ]

  const recentReviews = [
    {
      patient: 'John S.',
      rating: 5,
      review: 'Excellent consultation. Dr. was very thorough and explained everything clearly.',
      date: '2025-07-19'
    },
    {
      patient: 'Sarah W.',
      rating: 5,
      review: 'Great experience! The doctor was professional and answered all my questions.',
      date: '2025-07-18'
    },
    {
      patient: 'Michael B.',
      rating: 4,
      review: 'Good consultation overall. Would recommend to others.',
      date: '2025-07-17'
    }
  ]

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Analytics Dashboard</h1>
            <p className="text-body">Track your performance metrics and patient insights.</p>
          </div>

          {/* Date Range Filter */}
          <div className="card-medical mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <h3 className="heading-tertiary mb-4 md:mb-0">Performance Overview</h3>
              <div className="flex space-x-2">
                <select className="input-primary">
                  <option>This Month</option>
                  <option>Last 3 Months</option>
                  <option>Last 6 Months</option>
                  <option>This Year</option>
                </select>
                <button className="btn-outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </button>
                <button className="btn-primary">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{currentMonthStats.totalAppointments}</div>
              <div className="text-caption">Total Appointments</div>
              <div className="text-xs text-success-600 mt-1">+23% from last month</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">${currentMonthStats.totalRevenue}</div>
              <div className="text-caption">Total Revenue</div>
              <div className="text-xs text-success-600 mt-1">+18% from last month</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{currentMonthStats.avgRating}</div>
              <div className="text-caption">Average Rating</div>
              <div className="text-xs text-success-600 mt-1">⭐⭐⭐⭐⭐</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{currentMonthStats.responseTime}</div>
              <div className="text-caption">Avg Response Time</div>
              <div className="text-xs text-success-600 mt-1">-12% improvement</div>
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Trend */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Monthly Trends</h2>
                <button className="btn-outline text-xs">View Details</button>
              </div>
              <div className="space-y-4">
                {monthlyData.slice(-4).map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between p-3 bg-medical-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-primary-600">{month.month}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-medical-900">{month.appointments} appointments</div>
                        <div className="text-sm text-medical-600">${month.revenue} revenue</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-medical-900">{month.avgRating} ⭐</div>
                      <div className="text-xs text-medical-600">Rating</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient Demographics */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Patient Insights</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-medical-900 mb-3">Patient Type Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-medical-600">New Patients</span>
                      <span className="font-medium text-medical-900">{currentMonthStats.newPatients} (25%)</span>
                    </div>
                    <div className="w-full bg-medical-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-medical-600">Returning Patients</span>
                      <span className="font-medium text-medical-900">{currentMonthStats.returningPatients} (75%)</span>
                    </div>
                    <div className="w-full bg-medical-200 rounded-full h-2">
                      <div className="bg-accent-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-medical-900 mb-3">Completion Rate</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="w-full bg-medical-200 rounded-full h-3">
                        <div className="bg-success-600 h-3 rounded-full" style={{ width: `${currentMonthStats.completionRate}%` }}></div>
                      </div>
                    </div>
                    <span className="font-semibold text-success-600">{currentMonthStats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Conditions and Appointment Types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Conditions */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Top Conditions Treated</h2>
              </div>
              <div className="space-y-3">
                {topConditions.map((condition, index) => (
                  <div key={condition.condition} className="flex items-center justify-between p-3 bg-medical-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-medical-900">{condition.condition}</div>
                        <div className="text-sm text-medical-600">{condition.count} patients</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-medical-900">{condition.percentage}%</div>
                      <div className="w-16 bg-medical-200 rounded-full h-2 mt-1">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${condition.percentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appointment Types */}
            <div className="card-elevated">
              <div className="card-header">
                <h2 className="heading-secondary">Consultation Types</h2>
              </div>
              <div className="space-y-3">
                {appointmentTypes.map((type, index) => (
                  <div key={type.type} className="flex items-center justify-between p-3 bg-medical-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-primary-100' : index === 1 ? 'bg-accent-100' : 'bg-success-100'
                      }`}>
                        <span className={`font-semibold text-sm ${
                          index === 0 ? 'text-primary-600' : index === 1 ? 'text-accent-600' : 'text-success-600'
                        }`}>{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-medical-900">{type.type}</div>
                        <div className="text-sm text-medical-600">{type.count} consultations</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-medical-900">{type.percentage}%</div>
                      <div className="w-16 bg-medical-200 rounded-full h-2 mt-1">
                        <div className={`h-2 rounded-full ${
                          index === 0 ? 'bg-primary-600' : index === 1 ? 'bg-accent-600' : 'bg-success-600'
                        }`} style={{ width: `${type.percentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Recent Patient Reviews</h2>
              <button className="btn-outline text-xs">View All Reviews</button>
            </div>
            <div className="space-y-4">
              {recentReviews.map((review, index) => (
                <div key={index} className="p-4 bg-medical-50 rounded-xl border border-medical-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">{review.patient.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-medical-900">{review.patient}</div>
                        <div className="text-xs text-medical-600">{review.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-medical-700 text-sm italic">"{review.review}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}