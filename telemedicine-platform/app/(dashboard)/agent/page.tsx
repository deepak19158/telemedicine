"use client";

import { useRequireRole } from "../../../lib/hooks/useAuth";
import { useApi } from "../../../lib/hooks/useApi";
import { apiClient } from "../../../lib/api-client";
import {
  Users,
  DollarSign,
  TrendingUp,
  Gift,
  Link,
  Eye,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function AgentDashboard() {
  const { user, isLoading: authLoading } = useRequireRole("agent");

  // Fetch agent dashboard data
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useApi(() => apiClient.get("/agents/dashboard"));

  // Fetch recent referrals
  const {
    data: referralsData,
    loading: referralsLoading,
    error: referralsError,
    refetch: refetchReferrals,
  } = useApi(() => apiClient.get("/agents/referrals", { limit: "4" }));

  // Fetch agent commissions
  const { data: commissionsData, loading: commissionsLoading } = useApi(() =>
    apiClient.get("/agents/commissions")
  );

  const isLoading =
    authLoading || dashboardLoading || referralsLoading || commissionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    );
  }

  if (dashboardError || referralsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="text-center max-w-md">
          <div className="text-error-600 mb-4">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
            <p className="text-medical-600 mt-2">
              {dashboardError || referralsError}
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                refetchDashboard();
                refetchReferrals();
              }}
              className="btn-primary w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract data from API responses
  const agentStats = dashboardData?.data?.stats || {
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommissions: 0,
    monthlyCommissions: 0,
    conversionRate: 0,
    totalPatients: 0,
  };

  const recentReferrals = referralsData?.data?.referrals || [];
  const referralCodes = dashboardData?.data?.codes || [];

  console.log("🔍 Agent Dashboard Debug:", {
    dashboardData,
    referralsData,
    commissionsData,
    agentStats,
    recentReferrals: recentReferrals.length,
    referralCodes: referralCodes.length,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "converted":
        return <span className="badge-success">Converted</span>;
      case "pending":
        return <span className="badge-warning">Pending</span>;
      case "expired":
        return <span className="badge-error">Expired</span>;
      default:
        return <span className="badge-info">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-body">
              Track your referral performance and commission earnings.
            </p>
          </div>

          {/* Agent Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">
                {agentStats.totalReferrals}
              </div>
              <div className="text-caption">Total Referrals</div>
              <div className="text-xs text-success-600 mt-1">
                +12% this month
              </div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">
                ₹{agentStats.totalCommissions}
              </div>
              <div className="text-caption">Total Commissions</div>
              <div className="text-xs text-success-600 mt-1">
                ₹{agentStats.monthlyCommissions} this month
              </div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-accent-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">
                {agentStats.conversionRate}%
              </div>
              <div className="text-caption">Conversion Rate</div>
              <div className="text-xs text-success-600 mt-1">
                +5% improvement
              </div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">
                {agentStats.activeReferrals}
              </div>
              <div className="text-caption">Active Referrals</div>
              <div className="text-xs text-primary-600 mt-1">
                Pending conversion
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Referrals */}
            <div className="lg:col-span-2">
              <div className="card-elevated">
                <div className="card-header">
                  <h2 className="heading-secondary">Recent Referrals</h2>
                  <button className="btn-primary">
                    <Users className="w-4 h-4 mr-2" />
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {recentReferrals.length > 0 ? (
                    recentReferrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="p-4 bg-medical-50 rounded-xl border border-medical-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-primary-600 font-semibold text-sm">
                                {referral.patientName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-medical-900">
                                {referral.patientName}
                              </h3>
                              <p className="text-caption text-medical-600">
                                {referral.code}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(referral.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-medical-600 mb-3">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Referred: {referral.date}
                          </div>
                          {referral.appointmentDate && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Appointment: {referral.appointmentDate}
                            </div>
                          )}
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Commission: ₹{referral.commission || 0}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button className="btn-outline text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </button>
                          {referral.status === "pending" && (
                            <button className="btn-secondary text-xs">
                              Follow Up
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-medical-900 mb-2">
                        No Recent Referrals
                      </h3>
                      <p className="text-medical-600">
                        Start sharing your referral codes to see your referrals
                        here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Active Referral Codes */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Your Referral Codes</h3>
                <div className="space-y-3">
                  {referralCodes.length > 0 ? (
                    referralCodes.map((code, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white rounded-lg border border-medical-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-medical-900">
                            {code.code}
                          </span>
                          <span className="badge-success text-xs">Active</span>
                        </div>
                        <div className="text-sm text-medical-600 space-y-1">
                          <div>
                            {code.discountType === "percentage"
                              ? `${code.discountValue}% off`
                              : `₹${code.discountValue} off`}
                          </div>
                          <div>
                            Used: {code.usageCount || 0}/{code.maxUsage || 0}
                          </div>
                          <div>
                            Expires:{" "}
                            {code.expirationDate
                              ? new Date(
                                  code.expirationDate
                                ).toLocaleDateString()
                              : "No expiry"}
                          </div>
                        </div>
                        <div className="w-full bg-medical-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${code.maxUsage > 0 ? ((code.usageCount || 0) / code.maxUsage) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Gift className="w-12 h-12 text-medical-300 mx-auto mb-3" />
                      <h4 className="font-medium text-medical-900 mb-2">
                        No Referral Codes
                      </h4>
                      <p className="text-sm text-medical-600">
                        Contact admin to get your referral codes assigned.
                      </p>
                    </div>
                  )}
                </div>
                {referralCodes.length > 0 && (
                  <button className="btn-primary w-full mt-4">
                    <Link className="w-4 h-4 mr-2" />
                    Share Referral Link
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="btn-primary w-full">
                    <Gift className="w-4 h-4 mr-2" />
                    Generate Referral Link
                  </button>
                  <button className="btn-accent w-full">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </button>
                  <button className="btn-outline w-full">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Commission History
                  </button>
                </div>
              </div>

              {/* Monthly Performance */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">This Month</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">
                      New Referrals
                    </span>
                    <span className="text-sm font-medium text-medical-900">
                      {agentStats.monthlyReferrals || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">
                      Conversions
                    </span>
                    <span className="text-sm font-medium text-medical-900">
                      {agentStats.monthlyConversions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">Earnings</span>
                    <span className="text-sm font-medium text-medical-900">
                      ₹{agentStats.monthlyCommissions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-medical-600">
                      Success Rate
                    </span>
                    <span className="text-sm font-medium text-medical-900">
                      {agentStats.conversionRate || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Referral Tips */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Referral Tips</h3>
                <div className="space-y-3 text-sm text-medical-700">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <strong>Tip 1:</strong> Share your referral code with family
                    and friends for better conversion rates.
                  </div>
                  <div className="p-3 bg-accent-50 rounded-lg">
                    <strong>Tip 2:</strong> Follow up with pending referrals to
                    increase conversions.
                  </div>
                  <div className="p-3 bg-success-50 rounded-lg">
                    <strong>Tip 3:</strong> Use social media to reach a wider
                    audience.
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
