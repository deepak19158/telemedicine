# Patient Booking System

**Milestone:** 2 - Core Features  
**Timeline:** Weeks 5-8  
**Priority:** High  

## Tasks

### Booking Flow
- [ ] Create patient registration flow
- [ ] Implement doctor assignment system
- [ ] Build appointment booking interface
- [ ] Create appointment time slot selection
- [ ] Implement booking confirmation system
- [ ] Add appointment reminder system
- [ ] Create appointment history view
- [ ] Implement appointment cancellation
- [ ] Add medical history collection
- [ ] Create symptom checker interface

## Booking Process

### 1. Patient Registration
- Basic information collection
- Medical history questionnaire
- Emergency contact details
- Insurance information (if applicable)

### 2. Doctor Assignment
- Admin assigns patients to doctors
- Specialization-based assignment
- Availability consideration
- Geographic location (if relevant)

### 3. Appointment Booking
- Available slot selection
- Consultation type (general/specialist)
- Preferred date and time
- Special requirements

### 4. Payment Integration
- Referral code application
- Discount calculation
- Payment method selection
- Payment processing

### 5. Confirmation
- Booking confirmation
- Email/SMS notifications
- Calendar invites
- Appointment reminders

## Features

### Referral Code System
- Code validation
- Discount application
- Agent commission tracking
- Usage limit enforcement

### Medical History
- Previous consultations
- Current medications
- Allergies and conditions
- Family medical history

## API Endpoints
- `POST /api/patients/register` - Patient registration
- `GET /api/patients/doctors/assigned` - Get assigned doctor
- `POST /api/patients/appointments` - Book appointment
- `GET /api/patients/appointments` - Get appointment history
- `POST /api/patients/appointments/:id/cancel` - Cancel appointment

## Success Criteria
- [ ] Registration flow complete
- [ ] Doctor assignment working
- [ ] Booking interface functional
- [ ] Payment integration working
- [ ] Confirmation system active

## Notes
Ensure the booking process is intuitive and can be completed quickly by patients.