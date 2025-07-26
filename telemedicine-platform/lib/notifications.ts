import nodemailer from 'nodemailer'
import axios from 'axios'

// Email service using Gmail SMTP
class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const mailOptions = {
        from: `"Telemedicine Platform" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Email sent successfully:', result.messageId)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Email sending failed:', error)
      return { success: false, error: error.message }
    }
  }

  async sendAppointmentConfirmation(to: string, appointmentData: any) {
    const subject = 'Appointment Confirmation - Telemedicine Platform'
    const html = this.generateAppointmentConfirmationHTML(appointmentData)
    return await this.sendEmail(to, subject, html)
  }

  async sendPaymentConfirmation(to: string, paymentData: any) {
    const subject = 'Payment Confirmation - Telemedicine Platform'
    const html = this.generatePaymentConfirmationHTML(paymentData)
    return await this.sendEmail(to, subject, html)
  }

  async sendAppointmentReminder(to: string, appointmentData: any) {
    const subject = 'Appointment Reminder - Tomorrow'
    const html = this.generateAppointmentReminderHTML(appointmentData)
    return await this.sendEmail(to, subject, html)
  }

  async sendDoctorAssignment(to: string, assignmentData: any) {
    const subject = 'Doctor Assigned - Telemedicine Platform'
    const html = this.generateDoctorAssignmentHTML(assignmentData)
    return await this.sendEmail(to, subject, html)
  }

  async sendReferralReward(to: string, referralData: any) {
    const subject = 'Referral Reward Earned - Telemedicine Platform'
    const html = this.generateReferralRewardHTML(referralData)
    return await this.sendEmail(to, subject, html)
  }

  private generateAppointmentConfirmationHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { color: #2563EB; font-size: 24px; font-weight: bold; }
          .appointment-details { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #1f2937; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏥 Telemedicine Platform</div>
            <h1 style="color: #2563EB; margin-top: 10px;">Appointment Confirmed!</h1>
          </div>
          
          <p>Dear ${data.patientName},</p>
          
          <p>Your appointment has been successfully confirmed. Here are the details:</p>
          
          <div class="appointment-details">
            <div class="detail-row">
              <span class="label">Doctor:</span>
              <span class="value">${data.doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Specialization:</span>
              <span class="value">${data.specialization}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date & Time:</span>
              <span class="value">${new Date(data.appointmentDate).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Type:</span>
              <span class="value">${data.consultationType}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount Paid:</span>
              <span class="value">₹${data.amount}</span>
            </div>
            ${data.referralCode ? `
            <div class="detail-row">
              <span class="label">Referral Code Used:</span>
              <span class="value">${data.referralCode}</span>
            </div>
            ` : ''}
          </div>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>You'll receive a reminder 24 hours before your appointment</li>
            <li>Please join the consultation 5 minutes early</li>
            <li>Have your medical records and questions ready</li>
          </ul>
          
          <div class="footer">
            <p>Thank you for choosing our Telemedicine Platform!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private generatePaymentConfirmationHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #10B981; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { color: #10B981; font-size: 24px; font-weight: bold; }
          .payment-details { background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #1f2937; }
          .success { color: #10B981; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💳 Payment Confirmation</div>
            <h1 style="color: #10B981; margin-top: 10px;">Payment Successful!</h1>
          </div>
          
          <p>Dear ${data.patientName},</p>
          
          <p>Your payment has been <span class="success">successfully processed</span>. Here are the transaction details:</p>
          
          <div class="payment-details">
            <div class="detail-row">
              <span class="label">Transaction ID:</span>
              <span class="value">${data.transactionId}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount Paid:</span>
              <span class="value">₹${data.amount}</span>
            </div>
            <div class="detail-row">
              <span class="label">Payment Method:</span>
              <span class="value">${data.paymentMethod}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date & Time:</span>
              <span class="value">${new Date(data.paidAt).toLocaleString()}</span>
            </div>
            ${data.discount > 0 ? `
            <div class="detail-row">
              <span class="label">Discount Applied:</span>
              <span class="value">₹${data.discount}</span>
            </div>
            ` : ''}
          </div>
          
          <p><strong>Appointment Details:</strong></p>
          <ul>
            <li>Doctor: ${data.doctorName}</li>
            <li>Date: ${new Date(data.appointmentDate).toLocaleString()}</li>
            <li>Type: ${data.consultationType}</li>
          </ul>
          
          <div class="footer">
            <p>Your appointment is now confirmed!</p>
            <p>A detailed invoice has been sent separately.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private generateAppointmentReminderHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #F59E0B; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { color: #F59E0B; font-size: 24px; font-weight: bold; }
          .reminder-box { background-color: #fffbeb; border: 2px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #1f2937; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">⏰ Appointment Reminder</div>
            <h1 style="color: #F59E0B; margin-top: 10px;">Your appointment is tomorrow!</h1>
          </div>
          
          <p>Dear ${data.patientName},</p>
          
          <p>This is a friendly reminder about your upcoming appointment:</p>
          
          <div class="reminder-box">
            <div class="detail-row">
              <span class="label">Doctor:</span>
              <span class="value">${data.doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date & Time:</span>
              <span class="value">${new Date(data.appointmentDate).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Type:</span>
              <span class="value">${data.consultationType}</span>
            </div>
          </div>
          
          <p><strong>Please remember to:</strong></p>
          <ul>
            <li>Join the consultation 5 minutes early</li>
            <li>Have your medical records ready</li>
            <li>Prepare a list of questions for the doctor</li>
            <li>Ensure stable internet connection (for video consultations)</li>
          </ul>
          
          <div class="footer">
            <p>We look forward to serving you!</p>
            <p>If you need to reschedule, please contact us immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private generateDoctorAssignmentHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #8B5CF6; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { color: #8B5CF6; font-size: 24px; font-weight: bold; }
          .doctor-info { background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #1f2937; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">👨‍⚕️ Doctor Assignment</div>
            <h1 style="color: #8B5CF6; margin-top: 10px;">Doctor Assigned Successfully!</h1>
          </div>
          
          <p>Dear ${data.patientName},</p>
          
          <p>We're pleased to inform you that a doctor has been assigned to your account:</p>
          
          <div class="doctor-info">
            <div class="detail-row">
              <span class="label">Doctor Name:</span>
              <span class="value">${data.doctorName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Specialization:</span>
              <span class="value">${data.specialization}</span>
            </div>
            <div class="detail-row">
              <span class="label">Experience:</span>
              <span class="value">${data.experience} years</span>
            </div>
            <div class="detail-row">
              <span class="label">Consultation Fee:</span>
              <span class="value">₹${data.consultationFee}</span>
            </div>
          </div>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>You can now book appointments with your assigned doctor</li>
            <li>Access the booking system from your patient dashboard</li>
            <li>View doctor's available time slots</li>
            <li>All consultations will be with this dedicated doctor</li>
          </ul>
          
          <div class="footer">
            <p>Start your healthcare journey today!</p>
            <p>Login to your account to book your first appointment.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  private generateReferralRewardHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #F59E0B; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { color: #F59E0B; font-size: 24px; font-weight: bold; }
          .reward-info { background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #1f2937; }
          .amount { color: #F59E0B; font-size: 24px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎉 Referral Reward</div>
            <h1 style="color: #F59E0B; margin-top: 10px;">Congratulations!</h1>
          </div>
          
          <p>Dear ${data.agentName},</p>
          
          <p>Great news! You've earned a commission from a successful referral:</p>
          
          <div class="reward-info">
            <div style="text-align: center; margin-bottom: 20px;">
              <div class="amount">₹${data.commissionAmount}</div>
              <div>Commission Earned</div>
            </div>
            <div class="detail-row">
              <span class="label">Referral Code:</span>
              <span class="value">${data.referralCode}</span>
            </div>
            <div class="detail-row">
              <span class="label">Patient:</span>
              <span class="value">${data.patientName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Appointment Amount:</span>
              <span class="value">₹${data.appointmentAmount}</span>
            </div>
            <div class="detail-row">
              <span class="label">Commission Rate:</span>
              <span class="value">${data.commissionRate}%</span>
            </div>
          </div>
          
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Commission will be processed in the next payment cycle</li>
            <li>Check your agent dashboard for updated earnings</li>
            <li>Track all your referrals and commissions online</li>
          </ul>
          
          <div class="footer">
            <p>Keep referring and keep earning!</p>
            <p>Thank you for being a valuable partner.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

// SMS service using Fast2SMS (free tier)
class SMSService {
  private apiKey: string
  private senderId: string

  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY!
    this.senderId = process.env.SMS_SENDER_ID || 'TLMD'
  }

  async sendSMS(phone: string, message: string) {
    try {
      // Remove any non-numeric characters and ensure it's a valid Indian number
      const cleanPhone = phone.replace(/\D/g, '')
      const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`

      const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'v3',
        sender_id: this.senderId,
        message: message,
        language: 'english',
        flash: 0,
        numbers: formattedPhone
      }, {
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (response.data.return === true) {
        console.log('SMS sent successfully:', response.data.request_id)
        return { success: true, messageId: response.data.request_id }
      } else {
        console.error('SMS sending failed:', response.data.message)
        return { success: false, error: response.data.message }
      }
    } catch (error: any) {
      console.error('SMS API error:', error.response?.data || error.message)
      return { success: false, error: error.response?.data?.message || error.message }
    }
  }

  async sendAppointmentConfirmation(phone: string, appointmentData: any) {
    const message = `Hi ${appointmentData.patientName}! Your appointment with Dr. ${appointmentData.doctorName} is confirmed for ${new Date(appointmentData.appointmentDate).toLocaleDateString()} at ${new Date(appointmentData.appointmentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Payment: ₹${appointmentData.amount}. Thank you!`
    return await this.sendSMS(phone, message)
  }

  async sendPaymentConfirmation(phone: string, paymentData: any) {
    const message = `Payment successful! ₹${paymentData.amount} paid for appointment with Dr. ${paymentData.doctorName}. Transaction ID: ${paymentData.transactionId}. Your appointment is confirmed.`
    return await this.sendSMS(phone, message)
  }

  async sendAppointmentReminder(phone: string, appointmentData: any) {
    const message = `Reminder: Your appointment with Dr. ${appointmentData.doctorName} is tomorrow at ${new Date(appointmentData.appointmentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Please join 5 minutes early. Thank you!`
    return await this.sendSMS(phone, message)
  }

  async sendDoctorAssignment(phone: string, assignmentData: any) {
    const message = `Great news! Dr. ${assignmentData.doctorName} (${assignmentData.specialization}) has been assigned to your account. You can now book appointments. Login to get started!`
    return await this.sendSMS(phone, message)
  }
}

// Initialize services
export const emailService = new EmailService()
export const smsService = new SMSService()

// Unified notification function
export async function sendNotification(
  type: 'email' | 'sms' | 'both',
  notificationType: 'appointment_confirmation' | 'payment_confirmation' | 'appointment_reminder' | 'doctor_assignment' | 'referral_reward',
  recipient: { email?: string, phone?: string },
  data: any
) {
  const results = { email: null, sms: null }

  if (type === 'email' || type === 'both') {
    if (recipient.email) {
      switch (notificationType) {
        case 'appointment_confirmation':
          results.email = await emailService.sendAppointmentConfirmation(recipient.email, data)
          break
        case 'payment_confirmation':
          results.email = await emailService.sendPaymentConfirmation(recipient.email, data)
          break
        case 'appointment_reminder':
          results.email = await emailService.sendAppointmentReminder(recipient.email, data)
          break
        case 'doctor_assignment':
          results.email = await emailService.sendDoctorAssignment(recipient.email, data)
          break
        case 'referral_reward':
          results.email = await emailService.sendReferralReward(recipient.email, data)
          break
      }
    }
  }

  if (type === 'sms' || type === 'both') {
    if (recipient.phone) {
      switch (notificationType) {
        case 'appointment_confirmation':
          results.sms = await smsService.sendAppointmentConfirmation(recipient.phone, data)
          break
        case 'payment_confirmation':
          results.sms = await smsService.sendPaymentConfirmation(recipient.phone, data)
          break
        case 'appointment_reminder':
          results.sms = await smsService.sendAppointmentReminder(recipient.phone, data)
          break
        case 'doctor_assignment':
          results.sms = await smsService.sendDoctorAssignment(recipient.phone, data)
          break
      }
    }
  }

  return results
}