'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, CreditCard, CheckCircle, ArrowLeft, ArrowRight, AlertCircle, Info, Percent } from 'lucide-react'
import { apiClient } from '../../lib/api-client'
import { useApi } from '../../lib/hooks/useApi'

interface BookingStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<any>
}

interface BookingData {
  assignedDoctor?: any
  selectedDate?: string
  selectedTime?: string
  consultationType?: string
  reasonForVisit?: string
  patientNotes?: string
  referralCode?: string
  referralDiscount?: any
  medicalHistory?: any
  finalAmount?: number
  baseAmount?: number
  discount?: number
}

interface BookingWizardProps {
  onClose: () => void
  onComplete: (appointmentData: any) => void
}

// Step 1: Doctor Information & Selection
function DoctorSelectionStep({ bookingData, onUpdate, onNext }: any) {
  const { data: assignedDoctorData, loading, error } = useApi(() => 
    apiClient.get('/patients/doctors/assigned')
  )

  useEffect(() => {
    if (assignedDoctorData?.assignedDoctor) {
      onUpdate({ assignedDoctor: assignedDoctorData.assignedDoctor })
    }
  }, [assignedDoctorData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner-medical w-8 h-8"></div>
      </div>
    )
  }

  if (error || !assignedDoctorData?.assignedDoctor) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-warning-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-medical-900 mb-2">No Doctor Assigned</h3>
        <p className="text-medical-600 mb-4">
          You don't have an assigned doctor yet. Please contact admin to assign a doctor to your account.
        </p>
        <button className="btn-outline">Contact Support</button>
      </div>
    )
  }

  const doctor = assignedDoctorData.assignedDoctor

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-medical-900 mb-2">Your Assigned Doctor</h2>
        <p className="text-medical-600">Confirm your appointment with your assigned healthcare provider</p>
      </div>

      <div className="card-medical max-w-md mx-auto">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-medical-900 mb-1">{doctor.name}</h3>
          <p className="text-primary-600 font-medium mb-2">{doctor.specialization}</p>
          <p className="text-medical-600 text-sm mb-4">{doctor.experience} years experience</p>
          
          <div className="bg-medical-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-medical-700 font-medium">Consultation Fee:</span>
              <span className="text-lg font-semibold text-primary-600">₹{doctor.consultationFee}</span>
            </div>
          </div>

          {assignedDoctorData.appointmentHistory && (
            <div className="text-sm text-medical-600 mb-4">
              <p>Previous appointments: {assignedDoctorData.appointmentHistory.totalAppointments}</p>
              <p>Completed consultations: {assignedDoctorData.appointmentHistory.completedAppointments}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button 
          className="btn-primary px-8"
          onClick={onNext}
        >
          Continue with Dr. {doctor.name}
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  )
}

// Step 2: Date & Time Selection
function DateTimeSelectionStep({ bookingData, onUpdate, onNext, onPrevious }: any) {
  const [selectedDate, setSelectedDate] = useState(bookingData.selectedDate || '')
  const [selectedTime, setSelectedTime] = useState(bookingData.selectedTime || '')
  const [consultationType, setConsultationType] = useState(bookingData.consultationType || 'video')

  const { data: availableSlotsData, loading, refetch } = useApi(() => 
    bookingData.assignedDoctor ? 
    apiClient.get('/patients/doctors/available-slots', { 
      doctorId: bookingData.assignedDoctor.id,
      days: 14 
    }) : null
  )

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime('') // Reset time when date changes
    onUpdate({ selectedDate: date, selectedTime: '' })
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    onUpdate({ selectedTime: time })
  }

  const handleConsultationTypeChange = (type: string) => {
    setConsultationType(type)
    onUpdate({ consultationType: type })
  }

  const canProceed = selectedDate && selectedTime && consultationType

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner-medical w-8 h-8"></div>
      </div>
    )
  }

  const availableSlots = availableSlotsData?.availability || []
  const selectedDateSlots = availableSlots.find((day: any) => day.date === selectedDate)?.slots || []

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-medical-900 mb-2">Select Date & Time</h2>
        <p className="text-medical-600">Choose your preferred appointment slot</p>
      </div>

      {/* Consultation Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-medical-900 mb-3">Consultation Type</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleConsultationTypeChange('video')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              consultationType === 'video'
                ? 'border-primary-500 bg-primary-50'
                : 'border-medical-200 hover:border-medical-300'
            }`}
          >
            <div className="font-medium text-medical-900">Video Consultation</div>
            <div className="text-sm text-medical-600">Online consultation via video call</div>
          </button>
          <button
            onClick={() => handleConsultationTypeChange('in-person')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              consultationType === 'in-person'
                ? 'border-primary-500 bg-primary-50'
                : 'border-medical-200 hover:border-medical-300'
            }`}
          >
            <div className="font-medium text-medical-900">In-Person Visit</div>
            <div className="text-sm text-medical-600">Visit the medical center</div>
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-medical-900 mb-3">Select Date</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableSlots.map((day: any) => (
            <button
              key={day.date}
              onClick={() => handleDateSelect(day.date)}
              className={`p-3 border-2 rounded-lg text-center transition-colors ${
                selectedDate === day.date
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-medical-200 hover:border-medical-300'
              }`}
            >
              <div className="font-medium text-medical-900">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-sm text-medical-600">
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-xs text-primary-600 mt-1">
                {day.slots.length} slots
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-medical-900 mb-3">Select Time</label>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedDateSlots.map((slot: any) => (
              <button
                key={slot.time}
                onClick={() => handleTimeSelect(slot.time)}
                className={`p-3 border-2 rounded-lg text-center transition-colors ${
                  selectedTime === slot.time
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-medical-200 hover:border-medical-300'
                }`}
              >
                <div className="font-medium text-medical-900">
                  {new Date(`2000-01-01T${slot.time}`).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button 
          className="btn-outline"
          onClick={onPrevious}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={onNext}
          disabled={!canProceed}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  )
}

// Step 3: Medical Information & Referral Code
function MedicalInfoStep({ bookingData, onUpdate, onNext, onPrevious }: any) {
  const [reasonForVisit, setReasonForVisit] = useState(bookingData.reasonForVisit || '')
  const [patientNotes, setPatientNotes] = useState(bookingData.patientNotes || '')
  const [referralCode, setReferralCode] = useState(bookingData.referralCode || '')
  const [validatingCode, setValidatingCode] = useState(false)
  const [referralDiscount, setReferralDiscount] = useState(bookingData.referralDiscount || null)
  const [referralError, setReferralError] = useState('')

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralDiscount(null)
      setReferralError('')
      return
    }

    setValidatingCode(true)
    setReferralError('')

    try {
      const response = await apiClient.post('/referrals/validate', {
        code: code.trim(),
        orderAmount: bookingData.assignedDoctor?.consultationFee || 500
      })

      if (response.success) {
        setReferralDiscount(response.pricing)
        onUpdate({ 
          referralCode: code.trim(),
          referralDiscount: response.pricing,
          finalAmount: response.pricing.finalAmount,
          baseAmount: response.pricing.originalAmount,
          discount: response.pricing.discount
        })
      }
    } catch (error: any) {
      setReferralError(error.message || 'Invalid referral code')
      setReferralDiscount(null)
    } finally {
      setValidatingCode(false)
    }
  }

  const handleNext = () => {
    onUpdate({
      reasonForVisit,
      patientNotes,
      referralCode: referralCode.trim(),
      referralDiscount,
      finalAmount: referralDiscount?.finalAmount || bookingData.assignedDoctor?.consultationFee || 500,
      baseAmount: bookingData.assignedDoctor?.consultationFee || 500,
      discount: referralDiscount?.discount || 0
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-medical-900 mb-2">Medical Information</h2>
        <p className="text-medical-600">Help your doctor prepare for the consultation</p>
      </div>

      <div className="space-y-4">
        {/* Reason for Visit */}
        <div>
          <label className="block text-sm font-medium text-medical-900 mb-2">
            Reason for Visit <span className="text-error-500">*</span>
          </label>
          <select
            value={reasonForVisit}
            onChange={(e) => setReasonForVisit(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Select reason for visit</option>
            <option value="routine-checkup">Routine Checkup</option>
            <option value="follow-up">Follow-up Consultation</option>
            <option value="new-symptoms">New Symptoms</option>
            <option value="medication-review">Medication Review</option>
            <option value="preventive-care">Preventive Care</option>
            <option value="chronic-condition">Chronic Condition Management</option>
            <option value="second-opinion">Second Opinion</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Patient Notes */}
        <div>
          <label className="block text-sm font-medium text-medical-900 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={patientNotes}
            onChange={(e) => setPatientNotes(e.target.value)}
            className="input-field"
            rows={4}
            placeholder="Describe your symptoms, concerns, or any additional information you'd like to share with the doctor..."
          />
        </div>

        {/* Referral Code */}
        <div>
          <label className="block text-sm font-medium text-medical-900 mb-2">
            Referral Code (Optional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value)
                // Debounce validation
                if (e.target.value.trim().length >= 3) {
                  setTimeout(() => validateReferralCode(e.target.value), 500)
                }
              }}
              className="input-field pr-10"
              placeholder="Enter referral code to get discount"
            />
            {validatingCode && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="spinner-medical w-4 h-4"></div>
              </div>
            )}
          </div>
          
          {referralError && (
            <div className="mt-2 flex items-center text-sm text-error-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {referralError}
            </div>
          )}
          
          {referralDiscount && (
            <div className="mt-2 p-3 bg-success-50 border border-success-200 rounded-lg">
              <div className="flex items-center text-success-700 mb-2">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="font-medium">Referral code applied!</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Original Amount:</span>
                  <span>₹{referralDiscount.originalAmount}</span>
                </div>
                <div className="flex justify-between text-success-600">
                  <span>Discount:</span>
                  <span>-₹{referralDiscount.discount}</span>
                </div>
                <div className="flex justify-between font-medium text-success-700 border-t border-success-200 pt-1">
                  <span>Final Amount:</span>
                  <span>₹{referralDiscount.finalAmount}</span>
                </div>
                <div className="flex justify-between text-xs text-success-600">
                  <span>You save:</span>
                  <span>{referralDiscount.savingsPercentage}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button 
          className="btn-outline"
          onClick={onPrevious}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </button>
        <button 
          className="btn-primary"
          onClick={handleNext}
          disabled={!reasonForVisit}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  )
}

// Step 4: Review & Confirm
function ReviewConfirmStep({ bookingData, onUpdate, onNext, onPrevious }: any) {
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const handleConfirmBooking = async () => {
    setIsBooking(true)
    setBookingError('')

    try {
      const appointmentData = {
        doctorId: bookingData.assignedDoctor.id,
        appointmentDate: `${bookingData.selectedDate}T${bookingData.selectedTime}:00`,
        consultationType: bookingData.consultationType,
        reasonForVisit: bookingData.reasonForVisit,
        patientNotes: bookingData.patientNotes,
        referralCode: bookingData.referralCode || null,
        paymentMethod: 'pending'
      }

      const response = await apiClient.post('/patients/appointments', appointmentData)
      
      if (response.success) {
        onNext(response.appointment)
      }
    } catch (error: any) {
      setBookingError(error.message || 'Failed to book appointment')
    } finally {
      setIsBooking(false)
    }
  }

  const finalAmount = bookingData.finalAmount || bookingData.assignedDoctor?.consultationFee || 500

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-medical-900 mb-2">Review & Confirm</h2>
        <p className="text-medical-600">Please review your appointment details before confirming</p>
      </div>

      <div className="card-medical">
        <h3 className="font-semibold text-medical-900 mb-4">Appointment Details</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-medical-600">Doctor:</span>
            <span className="font-medium">{bookingData.assignedDoctor?.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-medical-600">Specialization:</span>
            <span className="font-medium">{bookingData.assignedDoctor?.specialization}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-medical-600">Date:</span>
            <span className="font-medium">
              {new Date(bookingData.selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-medical-600">Time:</span>
            <span className="font-medium">
              {new Date(`2000-01-01T${bookingData.selectedTime}`).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-medical-600">Type:</span>
            <span className="font-medium capitalize">{bookingData.consultationType}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-medical-600">Reason:</span>
            <span className="font-medium">{bookingData.reasonForVisit}</span>
          </div>
          
          {bookingData.referralCode && (
            <div className="flex justify-between">
              <span className="text-medical-600">Referral Code:</span>
              <span className="font-medium text-success-600">{bookingData.referralCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="card-medical">
        <h3 className="font-semibold text-medical-900 mb-4">Payment Summary</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-medical-600">Consultation Fee:</span>
            <span>₹{bookingData.baseAmount || bookingData.assignedDoctor?.consultationFee}</span>
          </div>
          
          {bookingData.discount > 0 && (
            <div className="flex justify-between text-success-600">
              <span>Discount ({bookingData.referralCode}):</span>
              <span>-₹{bookingData.discount}</span>
            </div>
          )}
          
          <div className="border-t border-medical-200 pt-3">
            <div className="flex justify-between text-lg font-semibold text-medical-900">
              <span>Total Amount:</span>
              <span>₹{finalAmount}</span>
            </div>
          </div>
        </div>
      </div>

      {bookingError && (
        <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-center text-error-700">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="font-medium">Booking Failed</span>
          </div>
          <p className="text-error-600 mt-1">{bookingError}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button 
          className="btn-outline"
          onClick={onPrevious}
          disabled={isBooking}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </button>
        <button 
          className="btn-primary px-8"
          onClick={handleConfirmBooking}
          disabled={isBooking}
        >
          {isBooking ? (
            <>
              <div className="spinner-medical w-4 h-4 mr-2"></div>
              Booking...
            </>
          ) : (
            <>
              Confirm Appointment
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Step 5: Success
function SuccessStep({ appointmentData, onClose }: any) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-success-600" />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-medical-900 mb-2">Appointment Booked Successfully!</h2>
        <p className="text-medical-600">Your appointment has been scheduled and confirmed.</p>
      </div>

      {appointmentData && (
        <div className="card-medical max-w-md mx-auto">
          <h3 className="font-semibold text-medical-900 mb-4">Appointment Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-medical-600">Appointment ID:</span>
              <span className="font-mono">{appointmentData.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-medical-600">Date & Time:</span>
              <span>{new Date(appointmentData.appointmentDate).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-medical-600">Amount:</span>
              <span className="font-semibold">₹{appointmentData.finalAmount}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button className="btn-primary w-full max-w-xs">
          View Appointment Details
        </button>
        <button 
          className="btn-outline w-full max-w-xs"
          onClick={onClose}
        >
          Back to Appointments
        </button>
      </div>
    </div>
  )
}

export default function BookingWizard({ onClose, onComplete }: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [bookingData, setBookingData] = useState<BookingData>({})
  const [appointmentData, setAppointmentData] = useState(null)

  const steps: BookingStep[] = [
    {
      id: 'doctor',
      title: 'Doctor',
      description: 'Verify assigned doctor',
      component: DoctorSelectionStep
    },
    {
      id: 'datetime',
      title: 'Date & Time',
      description: 'Select appointment slot',
      component: DateTimeSelectionStep
    },
    {
      id: 'medical',
      title: 'Medical Info',
      description: 'Consultation details',
      component: MedicalInfoStep
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Confirm booking',
      component: ReviewConfirmStep
    },
    {
      id: 'success',
      title: 'Success',
      description: 'Booking confirmed',
      component: SuccessStep
    }
  ]

  const updateBookingData = (newData: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...newData }))
  }

  const goToNext = (data?: any) => {
    if (currentStep === steps.length - 2) { // Review step
      setAppointmentData(data)
      onComplete(data)
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const goToPrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-medical-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-semibold text-medical-900">Book Appointment</h1>
            <button 
              onClick={onClose}
              className="text-medical-400 hover:text-medical-600"
            >
              ×
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  index <= currentStep 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-medical-200 text-medical-600'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className={`text-sm font-medium ${
                    index <= currentStep ? 'text-primary-600' : 'text-medical-600'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-medical-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ml-4 ${
                    index < currentStep ? 'bg-primary-600' : 'bg-medical-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <CurrentStepComponent
            bookingData={bookingData}
            onUpdate={updateBookingData}
            onNext={goToNext}
            onPrevious={goToPrevious}
            appointmentData={appointmentData}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  )
}