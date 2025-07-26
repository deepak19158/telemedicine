const express = require('express')
const User = require('../models/User')
const router = express.Router()

// Get user profile
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user profile
router.put('/profile/:id', async (req, res) => {
  try {
    const { name, phone, address } = req.body
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        'profile.name': name,
        'profile.phone': phone,
        'profile.address': address
      },
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router