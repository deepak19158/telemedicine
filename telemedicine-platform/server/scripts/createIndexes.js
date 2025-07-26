const mongoose = require('mongoose');
require('dotenv').config();

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

// Create indexes for better performance
async function createIndexes() {
  try {
    console.log('🔍 Creating database indexes...');
    
    const db = mongoose.connection.db;
    
    // User collection indexes
    console.log('📋 Creating User collection indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ 'profile.phone': 1 });
    await db.collection('users').createIndex({ isActive: 1 });
    await db.collection('users').createIndex({ isEmailVerified: 1 });
    await db.collection('users').createIndex({ createdAt: 1 });
    await db.collection('users').createIndex({ updatedAt: 1 });
    
    // Compound indexes for user queries
    await db.collection('users').createIndex({ role: 1, isActive: 1 });
    await db.collection('users').createIndex({ role: 1, isEmailVerified: 1 });
    
    // Doctor specific indexes
    await db.collection('users').createIndex({ 'profile.specialization': 1 });
    await db.collection('users').createIndex({ 'profile.consultationFee': 1 });
    await db.collection('users').createIndex({ 'profile.experience': 1 });
    
    // Appointment collection indexes
    console.log('📅 Creating Appointment collection indexes...');
    await db.collection('appointments').createIndex({ patientId: 1 });
    await db.collection('appointments').createIndex({ doctorId: 1 });
    await db.collection('appointments').createIndex({ appointmentDate: 1 });
    await db.collection('appointments').createIndex({ status: 1 });
    await db.collection('appointments').createIndex({ paymentStatus: 1 });
    await db.collection('appointments').createIndex({ referralCode: 1 });
    await db.collection('appointments').createIndex({ createdAt: 1 });
    await db.collection('appointments').createIndex({ updatedAt: 1 });
    
    // Compound indexes for appointment queries
    await db.collection('appointments').createIndex({ doctorId: 1, appointmentDate: 1 });
    await db.collection('appointments').createIndex({ patientId: 1, appointmentDate: 1 });
    await db.collection('appointments').createIndex({ doctorId: 1, status: 1 });
    await db.collection('appointments').createIndex({ patientId: 1, status: 1 });
    await db.collection('appointments').createIndex({ appointmentDate: 1, status: 1 });
    await db.collection('appointments').createIndex({ paymentStatus: 1, status: 1 });
    
    // Referral collection indexes
    console.log('🔗 Creating Referral collection indexes...');
    await db.collection('referrals').createIndex({ code: 1 }, { unique: true });
    await db.collection('referrals').createIndex({ agentId: 1 });
    await db.collection('referrals').createIndex({ assignedBy: 1 });
    await db.collection('referrals').createIndex({ isActive: 1 });
    await db.collection('referrals').createIndex({ expirationDate: 1 });
    await db.collection('referrals').createIndex({ usageCount: 1 });
    await db.collection('referrals').createIndex({ createdAt: 1 });
    await db.collection('referrals').createIndex({ updatedAt: 1 });
    
    // Compound indexes for referral queries
    await db.collection('referrals').createIndex({ agentId: 1, isActive: 1 });
    await db.collection('referrals').createIndex({ code: 1, isActive: 1 });
    await db.collection('referrals').createIndex({ isActive: 1, expirationDate: 1 });
    
    // Payment collection indexes
    console.log('💳 Creating Payment collection indexes...');
    await db.collection('payments').createIndex({ appointmentId: 1 });
    await db.collection('payments').createIndex({ patientId: 1 });
    await db.collection('payments').createIndex({ doctorId: 1 });
    await db.collection('payments').createIndex({ agentId: 1 });
    await db.collection('payments').createIndex({ status: 1 });
    await db.collection('payments').createIndex({ method: 1 });
    await db.collection('payments').createIndex({ transactionId: 1 });
    await db.collection('payments').createIndex({ createdAt: 1 });
    await db.collection('payments').createIndex({ updatedAt: 1 });
    
    // Compound indexes for payment queries
    await db.collection('payments').createIndex({ patientId: 1, status: 1 });
    await db.collection('payments').createIndex({ doctorId: 1, status: 1 });
    await db.collection('payments').createIndex({ agentId: 1, status: 1 });
    await db.collection('payments').createIndex({ appointmentId: 1, status: 1 });
    await db.collection('payments').createIndex({ method: 1, status: 1 });
    await db.collection('payments').createIndex({ createdAt: 1, status: 1 });
    
    // Text search indexes
    console.log('🔍 Creating text search indexes...');
    await db.collection('users').createIndex({
      'profile.name': 'text',
      'profile.specialization': 'text',
      'profile.qualifications': 'text',
      email: 'text'
    });
    
    await db.collection('appointments').createIndex({
      symptoms: 'text',
      consultationNotes: 'text',
      prescription: 'text'
    });
    
    // Time-based indexes for analytics
    console.log('📊 Creating analytics indexes...');
    await db.collection('appointments').createIndex({ 
      createdAt: 1, 
      doctorId: 1, 
      status: 1 
    });
    
    await db.collection('payments').createIndex({ 
      createdAt: 1, 
      agentId: 1, 
      status: 1 
    });
    
    await db.collection('referrals').createIndex({ 
      createdAt: 1, 
      agentId: 1, 
      usageCount: 1 
    });
    
    // Geospatial indexes for location-based queries (future use)
    console.log('🌍 Creating geospatial indexes...');
    await db.collection('users').createIndex({ 'profile.location': '2dsphere' });
    
    console.log('✅ All database indexes created successfully!');
    
    // List all indexes
    console.log('\n📋 Index Summary:');
    console.log('==================');
    
    const collections = ['users', 'appointments', 'referrals', 'payments'];
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`\n${collectionName.toUpperCase()}:`);
      indexes.forEach(index => {
        const keys = Object.keys(index.key).join(', ');
        const unique = index.unique ? ' (unique)' : '';
        const sparse = index.sparse ? ' (sparse)' : '';
        console.log(`  - ${keys}${unique}${sparse}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

// Run index creation if this file is executed directly
if (require.main === module) {
  (async () => {
    await connectDB();
    await createIndexes();
    await mongoose.disconnect();
    console.log('📦 Database connection closed');
    process.exit(0);
  })();
}

module.exports = { createIndexes, connectDB };