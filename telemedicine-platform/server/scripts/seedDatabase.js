const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Referral = require('../models/Referral');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Generate sample users
async function generateUsers() {
  const users = [];
  
  // Admin user
  users.push({
    email: 'admin@telemedicine.com',
    password: await bcrypt.hash('Admin123!', 10),
    role: 'admin',
    profile: {
      name: 'System Administrator',
      phone: '+1234567890',
      address: {
        street: '123 Admin St',
        city: 'Admin City',
        state: 'Admin State',
        zipCode: '12345',
        country: 'USA'
      }
    },
    isVerified: true,
    isActive: true
  });

  // Sample doctors
  const doctorSpecializations = [
    'General Medicine',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Psychiatry',
    'Gynecology',
    'Neurology'
  ];

  for (let i = 1; i <= 10; i++) {
    users.push({
      email: `doctor${i}@telemedicine.com`,
      password: await bcrypt.hash('Doctor123!', 10),
      role: 'doctor',
      profile: {
        name: `Dr. John Smith ${i}`,
        phone: `+123456789${i}`,
        specialization: doctorSpecializations[i % doctorSpecializations.length],
        experience: Math.floor(Math.random() * 20) + 1,
        qualifications: 'MBBS, MD',
        licenseNumber: `DOC${String(i).padStart(4, '0')}`,
        consultationFee: Math.floor(Math.random() * 100) + 50,
        address: {
          street: `${i}23 Medical St`,
          city: `Medical City ${i}`,
          state: 'Medical State',
          zipCode: `1234${i}`,
          country: 'USA'
        }
      },
      isVerified: true,
      isActive: true
    });
  }

  // Sample patients
  for (let i = 1; i <= 25; i++) {
    users.push({
      email: `patient${i}@telemedicine.com`,
      password: await bcrypt.hash('Patient123!', 10),
      role: 'patient',
      profile: {
        name: `Patient User ${i}`,
        phone: `+987654321${i}`,
        dateOfBirth: new Date(1990 + (i % 30), i % 12, (i % 28) + 1),
        gender: i % 2 === 0 ? 'male' : 'female',
        address: {
          street: `${i}45 Patient St`,
          city: `Patient City ${i}`,
          state: 'Patient State',
          zipCode: `9876${i}`,
          country: 'USA'
        },
        medicalHistory: {
          allergies: i % 3 === 0 ? ['Penicillin', 'Peanuts'] : [],
          medications: i % 4 === 0 ? ['Aspirin', 'Vitamin D'] : [],
          conditions: i % 5 === 0 ? ['Hypertension', 'Diabetes'] : []
        }
      },
      isVerified: true,
      isActive: true
    });
  }

  // Sample agents
  for (let i = 1; i <= 15; i++) {
    users.push({
      email: `agent${i}@telemedicine.com`,
      password: await bcrypt.hash('Agent123!', 10),
      role: 'agent',
      profile: {
        name: `Agent User ${i}`,
        phone: `+555666777${i}`,
        address: {
          street: `${i}67 Agent St`,
          city: `Agent City ${i}`,
          state: 'Agent State',
          zipCode: `5556${i}`,
          country: 'USA'
        },
        bankDetails: {
          accountNumber: `12345678${i}`,
          routingNumber: `98765432${i}`,
          bankName: `Bank of Agent ${i}`,
          accountHolderName: `Agent User ${i}`
        }
      },
      isVerified: true,
      isActive: true
    });
  }

  return users;
}

// Generate sample referral codes
async function generateReferralCodes() {
  const referrals = [];
  
  // Get all agents
  const agents = await User.find({ role: 'agent' });
  
  for (const agent of agents) {
    // Generate 2-3 referral codes per agent
    const numCodes = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 1; i <= numCodes; i++) {
      referrals.push({
        agentId: agent._id,
        code: `REF${agent.profile.name.replace(/\s+/g, '').toUpperCase().slice(0, 3)}${agent._id.toString().slice(-4).toUpperCase()}${String(i).padStart(2, '0')}`,
        discountType: i % 2 === 0 ? 'percentage' : 'fixed',
        discountValue: i % 2 === 0 ? Math.floor(Math.random() * 30) + 10 : Math.floor(Math.random() * 50) + 25,
        commissionType: 'percentage',
        commissionValue: Math.floor(Math.random() * 15) + 5, // 5-20% commission
        usageCount: Math.floor(Math.random() * 20),
        maxUsage: Math.floor(Math.random() * 100) + 50,
        expirationDate: new Date(Date.now() + (Math.floor(Math.random() * 180) + 30) * 24 * 60 * 60 * 1000),
        isActive: true,
        assignedBy: null // Will be set to admin ID after admin is created
      });
    }
  }

  return referrals;
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Referral.deleteMany({});
    
    // Generate and insert users
    console.log('👥 Generating users...');
    const users = await generateUsers();
    const insertedUsers = await User.insertMany(users);
    console.log(`✅ Created ${insertedUsers.length} users`);
    
    // Find admin user for referral codes
    const adminUser = insertedUsers.find(user => user.role === 'admin');
    
    // Generate and insert referral codes
    console.log('🔗 Generating referral codes...');
    const referrals = await generateReferralCodes();
    referrals.forEach(referral => {
      referral.assignedBy = adminUser._id;
    });
    const insertedReferrals = await Referral.insertMany(referrals);
    console.log(`✅ Created ${insertedReferrals.length} referral codes`);
    
    // Print summary
    console.log('\n📊 Database seeding summary:');
    console.log('================================');
    console.log(`👤 Admin users: 1`);
    console.log(`👨‍⚕️ Doctors: ${insertedUsers.filter(u => u.role === 'doctor').length}`);
    console.log(`🏥 Patients: ${insertedUsers.filter(u => u.role === 'patient').length}`);
    console.log(`🤝 Agents: ${insertedUsers.filter(u => u.role === 'agent').length}`);
    console.log(`🔗 Referral codes: ${insertedReferrals.length}`);
    console.log('================================');
    
    console.log('\n🔑 Test Login Credentials:');
    console.log('================================');
    console.log('Admin: admin@telemedicine.com / Admin123!');
    console.log('Doctor: doctor1@telemedicine.com / Doctor123!');
    console.log('Patient: patient1@telemedicine.com / Patient123!');
    console.log('Agent: agent1@telemedicine.com / Agent123!');
    console.log('================================');
    
    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await mongoose.disconnect();
    console.log('📦 Database connection closed');
    process.exit(0);
  })();
}

module.exports = { seedDatabase, connectDB };