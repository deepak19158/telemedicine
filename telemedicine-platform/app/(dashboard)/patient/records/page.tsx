'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { FileText, Download, Eye, Calendar, User, Activity, Pill, TestTube } from 'lucide-react'

export default function PatientRecords() {
  const { user, isLoading } = useRequireRole('patient')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const medicalRecords = [
    {
      id: 1,
      type: 'Consultation',
      doctor: 'Dr. Sarah Johnson',
      date: '2025-07-15',
      category: 'General Medicine',
      status: 'completed',
      files: ['consultation-notes.pdf', 'prescription.pdf']
    },
    {
      id: 2,
      type: 'Lab Report',
      doctor: 'Dr. Michael Chen',
      date: '2025-07-10',
      category: 'Blood Work',
      status: 'completed',
      files: ['blood-test-results.pdf', 'analysis-report.pdf']
    },
    {
      id: 3,
      type: 'Prescription',
      doctor: 'Dr. Sarah Johnson',
      date: '2025-07-08',
      category: 'Medication',
      status: 'active',
      files: ['prescription-details.pdf']
    },
    {
      id: 4,
      type: 'X-Ray',
      doctor: 'Dr. Robert Smith',
      date: '2025-07-01',
      category: 'Radiology',
      status: 'completed',
      files: ['chest-xray.jpg', 'radiology-report.pdf']
    }
  ]

  const healthStats = [
    { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', status: 'normal' },
    { label: 'Heart Rate', value: '72', unit: 'bpm', status: 'normal' },
    { label: 'Weight', value: '70', unit: 'kg', status: 'normal' },
    { label: 'BMI', value: '22.9', unit: '', status: 'normal' }
  ]

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'Consultation':
        return <User className="w-5 h-5" />
      case 'Lab Report':
        return <TestTube className="w-5 h-5" />
      case 'Prescription':
        return <Pill className="w-5 h-5" />
      case 'X-Ray':
        return <Activity className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge-success">Completed</span>
      case 'active':
        return <span className="badge-info">Active</span>
      case 'pending':
        return <span className="badge-warning">Pending</span>
      default:
        return <span className="badge-info">{status}</span>
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-success-600'
      case 'warning':
        return 'text-warning-600'
      case 'critical':
        return 'text-error-600'
      default:
        return 'text-medical-600'
    }
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">Medical Records</h1>
            <p className="text-body">Access your complete medical history, test results, and prescriptions.</p>
          </div>

          {/* Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {healthStats.map((stat, index) => (
              <div key={index} className="card-medical text-center">
                <div className="mb-3">
                  <div className="text-2xl font-bold text-medical-900">{stat.value}</div>
                  <div className="text-caption">{stat.unit}</div>
                </div>
                <div className="text-sm font-medium text-medical-900 mb-1">{stat.label}</div>
                <div className={`text-xs font-medium ${getHealthStatusColor(stat.status)} capitalize`}>
                  {stat.status}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Download All Records</h3>
              <button className="btn-primary w-full">Download PDF</button>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Request Records</h3>
              <button className="btn-accent w-full">Request Now</button>
            </div>
            <div className="card-medical text-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="font-semibold text-medical-900 mb-2">Share Records</h3>
              <button className="btn-outline w-full">Share</button>
            </div>
          </div>

          {/* Medical Records List */}
          <div className="card-elevated">
            <div className="card-header">
              <h2 className="heading-secondary">Medical History</h2>
              <div className="flex space-x-2">
                <select className="input-primary">
                  <option>All Categories</option>
                  <option>Consultations</option>
                  <option>Lab Reports</option>
                  <option>Prescriptions</option>
                  <option>Radiology</option>
                </select>
                <select className="input-primary">
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
                  <option>All Time</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {medicalRecords.map((record) => (
                <div key={record.id} className="p-6 bg-medical-50 rounded-xl border border-medical-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3 text-primary-600">
                          {getRecordIcon(record.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-medical-900">{record.type}</h3>
                          <p className="text-caption text-medical-600">{record.category}</p>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-medical-600 mb-3">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {record.doctor}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {record.date}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {record.files.map((file, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 bg-white rounded-md text-xs text-medical-600 border border-medical-200">
                            <FileText className="w-3 h-3 mr-1" />
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6 flex flex-col sm:flex-row gap-2">
                      <button className="btn-primary">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </button>
                      <button className="btn-outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
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