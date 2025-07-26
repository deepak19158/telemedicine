"use client";

import { useRequireRole } from "../../../lib/hooks/useAuth";
import { useDoctorProfile, useApi } from "../../../lib/hooks/useApi";
import { apiClient } from "../../../lib/api-client";
import {
  Calendar,
  Users,
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  FileText,
  Bell,
  AlertCircle,
} from "lucide-react";

export default function DoctorDashboard() {
  const { user, isLoading: authLoading } = useRequireRole("doctor");
  
  // Fetch doctor profile and dashboard data
  const { data: doctorProfile, loading: profileLoading, error: profileError } = useDoctorProfile();
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useApi(
    () => apiClient.get('/doctors/dashboard')
  );
  const { data: todayAppointments, loading: appointmentsLoading } = useApi(
    () => apiClient.get('/doctors/appointments', { date: new Date().toISOString().split('T')[0] })
  );

  const isLoading = authLoading || profileLoading || dashboardLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    );
  }

  if (profileError || dashboardError) {
    return (
      <div className="min-h-screen bg-medical-gradient-soft">
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="card-medical text-center max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
            <h2 className="heading-secondary text-error-600 mb-2">Error Loading Dashboard</h2>
            <p className="text-body mb-4">{profileError || dashboardError}</p>
            <button 
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract data with fallbacks
  const todayStats = {
    appointments: dashboardData?.stats?.todayAppointments || 0,
    patients: dashboardData?.stats?.todayPatients || 0,
    earnings: dashboardData?.stats?.todayEarnings || 0,
    consultations: dashboardData?.stats?.todayConsultations || 0,
  };

  const upcomingAppointments = todayAppointments?.appointments || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const weeklyStats = dashboardData?.weeklyStats || {
    appointments: 0,
    revenue: 0,
    rating: 0,
    responseTime: 0
  };

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">
              Good afternoon, Dr. {doctorProfile?.profile?.name?.split(" ")[1] || user?.name}!
            </h1>
            <p className="text-body">
              You have {todayStats.appointments} appointments scheduled for today.
            </p>
            {doctorProfile?.registrationStatus && (
              <div className="mt-2">
                <span className={`badge-${doctorProfile.registrationStatus === 'approved' ? 'success' : 'warning'}`}>
                  Status: {doctorProfile.registrationStatus}
                </span>
              </div>
            )}
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{todayStats.appointments}</div>
              <div className="text-caption">Today's Appointments</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{todayStats.patients}</div>
              <div className="text-caption">Patients Today</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">₹{todayStats.earnings}</div>
              <div className="text-caption">Today's Earnings</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">{todayStats.consultations}</div>
              <div className="text-caption">Consultations</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upcoming Appointments */}
            <div className="lg:col-span-2">
              <div className="card-elevated">
                <div className="card-header">
                  <h2 className="heading-secondary">Today's Schedule</h2>
                  <button className="btn-primary">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Full Calendar
                  </button>
                </div>
                <div className="space-y-4">
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((appointment: any) => (
                      <div
                        key={appointment._id}
                        className="p-4 bg-medical-50 rounded-xl border border-medical-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-medical-900">
                                {appointment.patientId?.profile?.name || appointment.patientId?.name || 'Patient'}
                              </h3>
                              <p className="text-caption text-medical-600">
                                {appointment.consultationType === 'video' ? 'Video Consultation' : 'In-person'}
                              </p>
                              {appointment.isNewPatient && (
                                <span className="text-xs bg-accent-100 text-accent-700 px-2 py-1 rounded mt-1 inline-block">
                                  New Patient
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-sm text-medical-600 mb-1">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(appointment.appointmentDate).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            <span
                              className={`badge-${appointment.status === "scheduled" ? "success" : "warning"}`}
                            >
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          {appointment.consultationType === 'video' && (
                            <button className="btn-primary text-xs">
                              Join Call
                            </button>
                          )}
                          <button className="btn-outline text-xs">
                            View History
                          </button>
                          <button className="btn-secondary text-xs">
                            Add Notes
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-medical-300 mx-auto mb-3" />
                      <p className="text-medical-600">No appointments scheduled for today</p>
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
                    <Calendar className="w-4 h-4 mr-2" />
                    Block Time Slot
                  </button>
                  <button className="btn-accent w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Add Notes
                  </button>
                  <button className="btn-outline w-full">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity: any) => (
                      <div key={activity._id || activity.id} className="flex items-start">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                            activity.type === "success"
                              ? "bg-success-500"
                              : activity.type === "info"
                                ? "bg-primary-500"
                                : "bg-warning-500"
                          }`}
                        ></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-medical-900">
                            {activity.action || activity.title}
                          </p>
                          <p className="text-xs text-medical-600">
                            {activity.patient || activity.description}
                          </p>
                          <p className="text-xs text-medical-500">
                            {activity.time || (activity.timestamp && new Date(activity.timestamp).toLocaleDateString())}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Activity className="w-8 h-8 text-medical-300 mx-auto mb-2" />
                      <p className="text-sm text-medical-500">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Overview */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">This Week</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">
                      Appointments
                    </span>
                    <span className="text-sm font-medium text-medical-900">
                      {weeklyStats.appointments}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Revenue</span>
                    <span className="text-sm font-medium text-medical-900">
                      ₹{weeklyStats.revenue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Rating</span>
                    <span className="text-sm font-medium text-medical-900">
                      {weeklyStats.rating || 'N/A'} {weeklyStats.rating && '⭐'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">
                      Response Time
                    </span>
                    <span className="text-sm font-medium text-medical-900">
                      {weeklyStats.responseTime || 'N/A'} {weeklyStats.responseTime && 'min'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
