# Agent Referral System

**Milestone:** 2 - Core Features  
**Timeline:** Weeks 5-8  
**Priority:** High  

## Tasks

### Referral System Core
- [ ] Create agent registration flow
- [ ] Implement referral code generation (admin)
- [ ] Build referral code validation system
- [ ] Create referral tracking mechanism
- [ ] Implement commission calculation
- [ ] Add referral analytics
- [ ] Create referral code expiration system
- [ ] Implement referral usage limits
- [ ] Add referral performance metrics
- [ ] Create referral code management (admin)

## System Components

### 1. Agent Registration
- Personal information
- Banking details for commissions
- Contact information
- Agreement acceptance
- Verification process

### 2. Referral Code Management
- Unique code generation
- Discount configuration
- Usage limits setting
- Expiration date setup
- Agent assignment

### 3. Commission System
- Percentage-based commissions
- Fixed amount commissions
- Tiered commission structure
- Payment tracking
- Commission history

### 4. Tracking & Analytics
- Code usage statistics
- Conversion rates
- Revenue generated
- Performance metrics
- Date range filtering

## Referral Code Features

### Code Structure
- Unique alphanumeric codes
- Easy to share format
- QR code generation
- Link-based sharing

### Discount Types
- Percentage discount (e.g., 10% off)
- Fixed amount discount (e.g., ₹100 off)
- Free consultation
- Package deals

### Usage Controls
- Maximum usage limit
- Expiration dates
- User restrictions
- One-time vs multiple use

## API Endpoints
- `POST /api/agents/register` - Agent registration
- `GET /api/agents/referrals` - Get referral history
- `POST /api/referrals/validate` - Validate referral code
- `GET /api/agents/commissions` - Get commission details
- `POST /api/admin/referrals/create` - Create referral code (admin)

## Commission Calculation
```javascript
// Example commission calculation
const commission = {
  percentage: 15, // 15% of consultation fee
  minimum: 50,    // Minimum ₹50 commission
  maximum: 500    // Maximum ₹500 commission
}
```

## Success Criteria
- [ ] Agent registration working
- [ ] Referral codes generated
- [ ] Code validation functional
- [ ] Commission tracking active
- [ ] Analytics dashboard ready

## Notes
This is a core differentiator for the platform. Ensure the system is reliable and transparent for agents.