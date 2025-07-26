# Development Tools

**Milestone:** 1 - Foundation & Setup  
**Timeline:** Weeks 1-4  
**Priority:** Medium  

## Tasks

### Backend Setup
- [ ] Set up Express.js backend server
- [ ] Configure CORS and security middleware
- [ ] Set up API route structure
- [ ] Configure environment variables
- [ ] Set up development database
- [ ] Create API testing setup with Postman/Thunder Client
- [ ] Set up logging system
- [ ] Configure error handling middleware
- [ ] Set up rate limiting
- [ ] Create health check endpoints

## API Structure
```
/api
├── auth/
├── patients/
├── doctors/
├── agents/
├── admin/
└── payments/
```

## Middleware Stack
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Express Rate Limit** - Rate limiting
- **Express Validator** - Input validation
- **Morgan** - Request logging
- **Compression** - Response compression

## Environment Variables
```env
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://deepak:zATksVZoxgA1TRL0@deepakecom.vybffzz.mongodb.net/telemedicine?retryWrites=true&w=majority
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

## Development Scripts
```json
{
  "dev": "next dev",
  "server": "nodemon server/app.js",
  "dev:full": "concurrently \"npm run dev\" \"npm run server\"",
  "build": "next build",
  "test": "jest",
  "lint": "eslint . --ext .js,.jsx,.ts,.tsx"
}
```

## Success Criteria
- [ ] Express.js server running
- [ ] API endpoints accessible
- [ ] Environment variables configured
- [ ] Development workflow established
- [ ] Error handling working

## Notes
Ensure proper separation between Next.js and Express.js for optimal performance.