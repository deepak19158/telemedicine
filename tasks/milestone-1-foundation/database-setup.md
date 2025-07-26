# Database Setup

**Milestone:** 1 - Foundation & Setup  
**Timeline:** Weeks 1-4  
**Priority:** High  

## Tasks

### MongoDB Configuration
- [x] Use existing MongoDB cloud cluster (deepakecom.vybffzz.mongodb.net)
- [ ] Set up database connection with provided URL
- [ ] Design and implement User schema (patients, doctors, agents, admin)
- [ ] Design and implement Appointment schema
- [ ] Design and implement Referral schema
- [ ] Design and implement Payment schema
- [ ] Set up Mongoose ODM with TypeScript support
- [ ] Create database connection utility
- [ ] Set up database seeding scripts for development
- [ ] Implement database indexing for performance

## Schema Design

### User Schema
```javascript
{
  _id: ObjectId,
  email: String,
  password: String, // hashed
  role: String, // 'patient', 'doctor', 'agent', 'admin'
  profile: {
    name: String,
    phone: String,
    address: Object,
    // Role-specific fields
  },
  createdAt: Date,
  updatedAt: Date,
  isActive: Boolean
}
```

### Key Collections
- Users (patients, doctors, agents, admin)
- Appointments
- Referrals
- Payments

## Success Criteria
- [ ] MongoDB connection established
- [ ] All schemas created with proper validation
- [ ] Database seeding working
- [ ] Proper indexing implemented

## Database Connection Details
```env
MONGODB_URI=mongodb+srv://deepak:zATksVZoxgA1TRL0@deepakecom.vybffzz.mongodb.net/telemedicine?retryWrites=true&w=majority
```

## Connection Setup
```javascript
// lib/db.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://deepak:zATksVZoxgA1TRL0@deepakecom.vybffzz.mongodb.net/telemedicine?retryWrites=true&w=majority';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
```

## Notes
- Using existing MongoDB cloud cluster: deepakecom.vybffzz.mongodb.net
- Database name will be 'telemedicine' 
- Focus on flexible schema design to accommodate different user roles and future enhancements.