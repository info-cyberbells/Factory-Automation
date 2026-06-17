const express = require('express');
const router = express.Router();
const { createTicket, getTickets, replyTicket } = require('../controllers/supportController');
const { protect } = require('../middleware/auth');

// Public route to submit concern
router.post('/ticket', createTicket);

// Protected routes (Super Admin / Admin only)
router.get('/tickets', protect, getTickets);
router.put('/tickets/:id/reply', protect, replyTicket);

module.exports = router;
