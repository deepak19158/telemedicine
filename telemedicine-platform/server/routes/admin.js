const express = require('express')
const User = require('../models/User')
const router = express.Router()

// Get admin dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalPatients = await User.countDocuments({ role: 'patient' })
    const totalDoctors = await User.countDocuments({ role: 'doctor' })
    const totalAgents = await User.countDocuments({ role: 'agent' })
    const pendingDoctors = await User.countDocuments({ 
      role: 'doctor', 
      isActive: false 
    })
    
    res.json({
      stats: {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalAgents,
        pendingDoctors
      },
      recentUsers: await User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('profile.name role email createdAt isActive')
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Approve doctor
router.put('/doctors/:id/approve', async (req, res) => {
  try {
    const doctor = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password')
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ error: 'Doctor not found' })
    }
    
    res.json({ message: 'Doctor approved successfully', doctor })
  } catch (error) {
    console.error('Approve doctor error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query
    const query = role ? { role } : {}
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
    
    const total = await User.countDocuments(query)
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router