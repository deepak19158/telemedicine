# Notification Service Setup Guide

This guide explains how to set up the free email and SMS notification services for the telemedicine platform.

## Overview

The platform uses:
- **Gmail SMTP** for email notifications (free)
- **Fast2SMS** for SMS notifications (free tier)

## Email Service Setup (Gmail SMTP)

### 1. Enable Gmail SMTP

1. **Enable 2-Factor Authentication**:
   - Go to your Google Account settings
   - Enable 2-factor authentication if not already enabled

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Generate a 16-character app password
   - Copy this password (you won't see it again)

### 2. Update Environment Variables

```env
# Email Service (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

### 3. Gmail SMTP Limits

- **Free tier**: Up to 500 emails per day
- **Rate limit**: No more than 10 emails per minute
- **Security**: Use app passwords, not regular passwords

## SMS Service Setup (Fast2SMS)

### 1. Create Fast2SMS Account

1. Visit: https://www.fast2sms.com/
2. Sign up for a free account
3. Verify your mobile number
4. You'll receive free credits (usually 10-50 SMS)

### 2. Get API Key

1. Login to Fast2SMS dashboard
2. Go to "API Keys" section
3. Copy your API key

### 3. Update Environment Variables

```env
# SMS Service (Fast2SMS - Free Tier)
FAST2SMS_API_KEY=your-fast2sms-api-key
SMS_SENDER_ID=TLMD
```

### 4. Fast2SMS Free Tier Limits

- **Free credits**: 10-50 SMS (varies by promotion)
- **Daily limit**: 100 SMS per day (paid plans)
- **Rate limit**: No more than 1 SMS per second
- **Countries**: India only

## Alternative SMS Services (Free Tiers)

If Fast2SMS doesn't work in your region:

### TextLocal (Free Tier - UK/India)
```env
TEXTLOCAL_API_KEY=your-textlocal-key
TEXTLOCAL_SENDER=TLMD
```

### Twilio (Free Trial)
```env
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

### MSG91 (Free Credits - India)
```env
MSG91_API_KEY=your-msg91-key
MSG91_TEMPLATE_ID=your-template-id
```

## Notification Categories

The platform sends these types of notifications:

### 1. Appointment Confirmation
- **Trigger**: After successful payment
- **Type**: Email + SMS
- **Content**: Appointment details, doctor info, payment confirmation

### 2. Payment Confirmation
- **Trigger**: Payment completed
- **Type**: Email + SMS
- **Content**: Transaction details, receipt information

### 3. Appointment Reminder
- **Trigger**: 24 hours before appointment
- **Type**: Email + SMS
- **Content**: Reminder with appointment details

### 4. Doctor Assignment
- **Trigger**: Admin assigns doctor to patient
- **Type**: Email + SMS
- **Content**: Doctor details, specialization, contact info

### 5. Referral Reward
- **Trigger**: Commission earned by agent
- **Type**: Email (primary)
- **Content**: Commission amount, referral details

## Testing Notifications

### 1. Email Testing

```bash
# Test email service
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "type": "email",
    "category": "appointment_confirmation",
    "recipient": {"email": "test@example.com"},
    "data": {
      "patientName": "Test Patient",
      "doctorName": "Dr. Test",
      "specialization": "General Medicine",
      "appointmentDate": "2024-01-01T10:00:00Z",
      "consultationType": "Video",
      "amount": 500
    }
  }'
```

### 2. SMS Testing

```bash
# Test SMS service
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "type": "sms",
    "category": "appointment_confirmation",
    "recipient": {"phone": "+919876543210"},
    "data": {
      "patientName": "Test Patient",
      "doctorName": "Dr. Test",
      "appointmentDate": "2024-01-01T10:00:00Z",
      "amount": 500
    }
  }'
```

## Troubleshooting

### Email Issues

1. **Authentication Failed**:
   - Verify app password is correct
   - Check if 2FA is enabled
   - Ensure "Less secure app access" is disabled (use app passwords)

2. **Rate Limiting**:
   - Gmail allows 500 emails/day
   - Implement queuing for high volume

3. **Emails Going to Spam**:
   - Add SPF/DKIM records to your domain
   - Use a consistent "From" address
   - Avoid spam keywords in subject lines

### SMS Issues

1. **API Key Invalid**:
   - Check if API key is copied correctly
   - Verify account is active

2. **Number Format**:
   - Use international format: +91xxxxxxxxxx
   - Remove spaces and special characters

3. **Credits Exhausted**:
   - Check account balance
   - Purchase more credits or upgrade plan

## Security Best Practices

### 1. Environment Variables
- Never commit API keys to version control
- Use different keys for development/production
- Rotate keys regularly

### 2. Rate Limiting
- Implement notification rate limiting
- Use queues for bulk notifications
- Monitor usage to avoid exceeding limits

### 3. User Preferences
- Allow users to opt-out of notifications
- Respect quiet hours settings
- Provide unsubscribe options

## Monitoring and Analytics

### 1. Notification Tracking
- All notifications are logged in the database
- Track delivery status (sent, failed, delivered)
- Monitor failure rates

### 2. Dashboard Metrics
- Email delivery rates
- SMS delivery rates
- Popular notification types
- Failure analysis

### 3. Alerts
- Set up alerts for high failure rates
- Monitor API quota usage
- Track unusual activity

## Cost Optimization

### 1. Email (Gmail)
- **Cost**: Free (500 emails/day)
- **Scaling**: Use Google Workspace for higher limits
- **Alternatives**: SendGrid, Mailgun (paid)

### 2. SMS (Fast2SMS)
- **Cost**: ₹0.15-₹0.25 per SMS
- **Free credits**: 10-50 SMS on signup
- **Bulk pricing**: Lower rates for higher volumes

### 3. Optimization Tips
- Combine notifications when possible
- Use email for detailed info, SMS for alerts
- Implement smart retry logic
- Cache templates to reduce processing

## Production Deployment

### 1. Email Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=production-app-password
```

### 2. SMS Configuration
```env
FAST2SMS_API_KEY=production-api-key
SMS_SENDER_ID=YOURAPP
```

### 3. Monitoring
- Set up error logging
- Monitor delivery rates
- Track user engagement
- Implement fallback services

## Support and Documentation

- **Fast2SMS Support**: https://www.fast2sms.com/support
- **Gmail SMTP Help**: https://support.google.com/mail/answer/7126229
- **Platform Issues**: Check notification logs in admin dashboard

This setup provides a robust, cost-effective notification system suitable for small to medium-scale telemedicine platforms.