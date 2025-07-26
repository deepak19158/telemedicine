const express = require('express')
const User = require('../models/User')
const router = express.Router()

// Get patient dashboard data
router.get('/dashboard/:id', async (req, res) => {
  try {
    const patient = await User.findById(req.params.id)
      .populate('profile.assignedDoctor', 'profile.name profile.specialization')
      .select('-password')
    
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' })
    }
    
    res.json({
      patient,
      upcomingAppointments: [], // TODO: Implement appointments
      recentAppointments: [] // TODO: Implement appointments
    })
  } catch (error) {
    console.error('Patient dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get assigned doctor
router.get('/doctor/:patientId', async (req, res) => {
  try {
    const patient = await User.findById(req.params.patientId)
      .populate('profile.assignedDoctor', 'profile.name profile.specialization profile.phone')
    
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' })
    }
    
    res.json(patient.profile.assignedDoctor)
  } catch (error) {
    console.error('Get assigned doctor error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router