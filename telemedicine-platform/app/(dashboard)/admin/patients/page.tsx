"use client";

import { useState } from "react";
import { useRequireRole } from "../../../../lib/hooks/useAuth";
import { useApi, useApiMutation } from "../../../../lib/hooks/useApi";
import { apiClient } from "../../../../lib/api-client";
import {
  Users,
  UserCheck,
  Search,
  Filter,
  Calendar,
  Mail,
  Phone,
  AlertCircle,
  Eye,
  UserPlus,
  X,
  Save,
  Activity,
  Stethoscope,
} from "lucide-react";

export default function AdminPatientsPage() {
  const { user, isLoading: authLoading } = useRequireRole("admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showAssignDoctorModal, setShowAssignDoctorModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch patients
  const {
    data: patientsData,
    loading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients,
  } = useApi(() =>
    apiClient.admin.getUsers({
      role: "patient",
      search: searchQuery,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: "20",
    })
  );
  console.log(patientsData);
  // Fetch doctors for assignment
  const { data: doctorsData, loading: doctorsLoading } = useApi(() =>
    apiClient.doctor.search({ verified: true, limit: "50" })
  );

  // Assign doctor mutation
  const { mutate: assignDoctor, loading: assigningDoctor } = useApiMutation(
    (assignmentData: any) =>
      apiClient.post("/admin/patients/assign-doctor", assignmentData),
    {
      onSuccess: () => {
        setShowAssignDoctorModal(false);
        setSelectedPatient(null);
        setSelectedDoctor("");
        refetchPatients();
        alert("Doctor assigned successfully!");
      },
      onError: (error) => {
        console.error("Failed to assign doctor:", error);
        alert("Failed to assign doctor: " + error);
      },
    }
  );

  const isLoading = authLoading || patientsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="min-h-screen bg-medical-gradient-soft flex items-center justify-center">
        <div className="card-medical text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h2 className="heading-secondary text-error-600 mb-2">
            Error Loading Patients
          </h2>
          <p className="text-body mb-4">{patientsError}</p>
          <button className="btn-primary" onClick={() => refetchPatients()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const patients = patientsData?.users || [];
  const doctors = doctorsData?.doctors || [];
  const pagination = patientsData?.pagination || {};

  const handleAssignDoctor = async () => {
    if (!selectedPatient || !selectedDoctor) {
      alert("Please select both patient and doctor");
      return;
    }

    await assignDoctor({
      patientId: selectedPatient._id,
      doctorId: selectedDoctor,
    });
  };

  const getAssignedDoctor = (patient: any) => {
    return patient.profile?.assignedDoctor || null;
  };

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Patient Management</h1>
            <p className="text-body">
              Manage patients and assign doctors for consultations.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">
                {patients.length}
              </div>
              <div className="text-caption">Total Patients</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-6 h-6 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">
                {patients.filter((p) => getAssignedDoctor(p)).length}
              </div>
              <div className="text-caption">Assigned Patients</div>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-6 h-6 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-medical-900 mb-1">
                {patients.filter((p) => !getAssignedDoctor(p)).length}
              </div>
              <div className="text-caption">Unassigned Patients</div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="card-elevated mb-8">
            <div className="card-header">
              <h2 className="heading-secondary">Patients</h2>
              <div className="flex space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-medical-400" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    className="input-primary pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <select
                  className="input-primary"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Patients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.length > 0 ? (
                patients.map((patient: any) => {
                  const assignedDoctor = getAssignedDoctor(patient);
                  return (
                    <div
                      key={patient._id}
                      className="p-6 bg-medical-50 rounded-xl border border-medical-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <Users className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-medical-900">
                              {patient.profile?.name ||
                                patient.name ||
                                "No Name"}
                            </h3>
                            <p className="text-caption text-medical-600">
                              {patient.email}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`badge-${patient.isActive ? "success" : "error"}`}
                        >
                          {patient.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {patient.profile?.phone && (
                          <div className="flex items-center text-sm text-medical-600">
                            <Phone className="w-4 h-4 mr-2" />
                            {patient.profile.phone}
                          </div>
                        )}

                        <div className="flex items-center text-sm text-medical-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Joined{" "}
                          {new Date(patient.createdAt).toLocaleDateString()}
                        </div>

                        {assignedDoctor ? (
                          <div className="flex items-center text-sm text-medical-600">
                            <Stethoscope className="w-4 h-4 mr-2" />
                            Dr.{" "}
                            {assignedDoctor.profile?.name ||
                              assignedDoctor.name}
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-warning-600">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            No doctor assigned
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          className="btn-outline text-xs flex-1"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </button>

                        <button
                          className="btn-primary text-xs flex-1"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowAssignDoctorModal(true);
                          }}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          {assignedDoctor ? "Reassign" : "Assign"} Doctor
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <Users className="w-16 h-16 text-medical-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-medical-900 mb-2">
                    No patients found
                  </h3>
                  <p className="text-medical-600">
                    {searchQuery
                      ? "Try adjusting your search or filters."
                      : "No patients match your current filters."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Doctor Modal */}
      {showAssignDoctorModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-medical-200">
              <div className="flex items-center justify-between">
                <h2 className="heading-secondary">Assign Doctor</h2>
                <button
                  onClick={() => setShowAssignDoctorModal(false)}
                  className="p-2 hover:bg-medical-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-medical-600 mt-1">
                Assign a doctor to{" "}
                {selectedPatient.profile?.name || selectedPatient.name}
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-1">
                    Patient
                  </label>
                  <div className="p-3 bg-medical-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-medical-900">
                          {selectedPatient.profile?.name ||
                            selectedPatient.name}
                        </div>
                        <div className="text-sm text-medical-600">
                          {selectedPatient.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-medical-700 mb-1">
                    Select Doctor *
                  </label>
                  {doctorsLoading ? (
                    <div className="p-3 text-center">
                      <div className="spinner-medical w-6 h-6 mx-auto"></div>
                      <p className="text-sm text-medical-600 mt-2">
                        Loading doctors...
                      </p>
                    </div>
                  ) : (
                    <select
                      className="input-primary w-full"
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                    >
                      <option value="">Choose a doctor...</option>
                      {doctors.map((doctor: any) => (
                        <option key={doctor._id} value={doctor._id}>
                          Dr. {doctor.profile?.name || doctor.name} -{" "}
                          {doctor.profile?.specialization || "General"}
                        </option>
                      ))}
                    </select>
                  )}
                  {doctors.length === 0 && !doctorsLoading && (
                    <p className="text-sm text-error-600 mt-1">
                      No verified doctors available
                    </p>
                  )}
                </div>

                {selectedPatient.profile?.assignedDoctor && (
                  <div className="p-3 bg-warning-50 rounded-lg">
                    <p className="text-sm text-warning-700">
                      <strong>Current doctor:</strong> Dr.{" "}
                      {selectedPatient.profile.assignedDoctor.profile?.name ||
                        selectedPatient.profile.assignedDoctor.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignDoctorModal(false)}
                  className="btn-outline flex-1"
                  disabled={assigningDoctor}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignDoctor}
                  className="btn-primary flex-1"
                  disabled={assigningDoctor || !selectedDoctor}
                >
                  {assigningDoctor ? (
                    <div className="flex items-center">
                      <div className="spinner-medical w-4 h-4 mr-2"></div>
                      Assigning...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Assign Doctor
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
