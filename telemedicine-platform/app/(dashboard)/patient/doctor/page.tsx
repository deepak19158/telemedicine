'use client'

import { useRequireRole } from '../../../../lib/hooks/useAuth'
import { User, Phone, Mail, MapPin, Star, Calendar, Award, Clock } from 'lucide-react'

export default function PatientMyDoctor() {
  const { user, isLoading } = useRequireRole('patient')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-medical-gradient-soft">
        <div className="spinner-medical w-16 h-16"></div>
      </div>
    )
  }

  const assignedDoctor = {
    name: 'Dr. Sarah Johnson',
    specialization: 'General Medicine',
    experience: '12 years',
    rating: 4.8,
    totalReviews: 234,
    education: 'MD from Harvard Medical School',
    certifications: ['Board Certified Internal Medicine', 'ACLS Certified'],
    languages: ['English', 'Spanish'],
    consultationFee: 75,
    avatar: '/images/doctor-avatar.jpg',
    contact: {
      phone: '+1 (555) 123-4567',
      email: 'dr.johnson@medicare.com'
    },
    schedule: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 3:00 PM',
      saturday: 'Emergency Only',
      sunday: 'Closed'
    }
  }

  return (
    <div className="min-h-screen bg-medical-gradient-soft">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-primary mb-2">My Assigned Doctor</h1>
            <p className="text-body">Your primary healthcare provider information and contact details.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Doctor Profile Card */}
            <div className="lg:col-span-2">
              <div className="card-elevated">
                <div className="flex flex-col md:flex-row items-start">
                  <div className="w-32 h-32 bg-primary-100 rounded-xl flex items-center justify-center mb-6 md:mb-0 md:mr-6">
                    <User className="w-16 h-16 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                      <div>
                        <h2 className="heading-secondary mb-1">{assignedDoctor.name}</h2>
                        <p className="text-body text-primary-600 mb-2">{assignedDoctor.specialization}</p>
                        <div className="flex items-center space-x-4 text-sm text-medical-600">
                          <div className="flex items-center">
                            <Award className="w-4 h-4 mr-1" />
                            {assignedDoctor.experience}
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-500" />
                            {assignedDoctor.rating} ({assignedDoctor.totalReviews} reviews)
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0">
                        <button className="btn-primary mb-2 w-full md:w-auto">Book Appointment</button>
                        <p className="text-caption text-center">Consultation Fee: ${assignedDoctor.consultationFee}</p>
                      </div>
                    </div>

                    {/* Education & Certifications */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-medical-900 mb-1">Education</h4>
                        <p className="text-body">{assignedDoctor.education}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-medical-900 mb-1">Certifications</h4>
                        <div className="flex flex-wrap gap-2">
                          {assignedDoctor.certifications.map((cert, index) => (
                            <span key={index} className="badge-success">{cert}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-medical-900 mb-1">Languages</h4>
                        <div className="flex flex-wrap gap-2">
                          {assignedDoctor.languages.map((lang, index) => (
                            <span key={index} className="badge-info">{lang}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Schedule */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-primary-600 mr-3" />
                    <div>
                      <p className="font-medium text-medical-900">{assignedDoctor.contact.phone}</p>
                      <p className="text-caption">Emergency Contact</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-primary-600 mr-3" />
                    <div>
                      <p className="font-medium text-medical-900">{assignedDoctor.contact.email}</p>
                      <p className="text-caption">General Inquiries</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-medical-200">
                  <button className="btn-accent w-full">Send Message</button>
                </div>
              </div>

              {/* Schedule */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Availability</h3>
                <div className="space-y-2">
                  {Object.entries(assignedDoctor.schedule).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="font-medium text-medical-900 capitalize">{day}</span>
                      <span className="text-medical-600">{hours}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-medical-200">
                  <div className="flex items-center text-sm text-medical-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Timezone: EST (UTC-5)
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card-medical">
                <h3 className="heading-tertiary mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="btn-primary w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Calendar
                  </button>
                  <button className="btn-secondary w-full">
                    <Star className="w-4 h-4 mr-2" />
                    Rate Doctor
                  </button>
                  <button className="btn-outline w-full">
                    <User className="w-4 h-4 mr-2" />
                    Request Doctor Change
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}