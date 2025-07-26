const express = require('express')
const User = require('../models/User')
const router = express.Router()

// Get agent dashboard data
router.get('/dashboard/:id', async (req, res) => {
  try {
    const agent = await User.findById(req.params.id).select('-password')
    
    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ error: 'Agent not found' })
    }
    
    res.json({
      agent,
      referralStats: {
        totalReferrals: 0,
        monthlyReferrals: 0,
        totalCommissions: 0,
        pendingCommissions: 0
      }, // TODO: Implement referral tracking
      recentReferrals: [] // TODO: Implement referral history
    })
  } catch (error) {
    console.error('Agent dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all agents
router.get('/list', async (req, res) => {
  try {
    const agents = await User.find({ 
      role: 'agent',
      isActive: true 
    }).select('profile.name profile.phone profile.agentCode email')
    
    res.json(agents)
  } catch (error) {
    console.error('Get agents error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router