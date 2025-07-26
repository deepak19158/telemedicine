const express = require('express')
const User = require('../models/User')
const router = express.Router()

// Get doctor dashboard data
router.get('/dashboard/:id', async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id).select('-password')
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ error: 'Doctor not found' })
    }
    
    // Get assigned patients
    const assignedPatients = await User.find({
      role: 'patient',
      'profile.assignedDoctor': doctor._id
    }).select('profile.name profile.phone email')
    
    res.json({
      doctor,
      assignedPatients,
      todayAppointments: [], // TODO: Implement appointments
      weeklyStats: {} // TODO: Implement analytics
    })
  } catch (error) {
    console.error('Doctor dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all doctors
router.get('/list', async (req, res) => {
  try {
    const doctors = await User.find({ 
      role: 'doctor',
      isActive: true 
    }).select('profile.name profile.specialization profile.phone email')
    
    res.json(doctors)
  } catch (error) {
    console.error('Get doctors error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router