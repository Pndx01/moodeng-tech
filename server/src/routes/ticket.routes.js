/**
 * Ticket Routes
 */

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth.middleware');
const { uploadTicketPhotos, handleUploadError } = require('../middleware/upload.middleware');
const { 
  createTicketValidation, 
  updateTicketStatusValidation, 
  ticketIdValidation,
  paginationValidation 
} = require('../middleware/validation.middleware');

// Public route - track ticket by number (optional auth for sensitive data)
router.get('/track/:ticketNumber', optionalAuth, ticketController.trackTicket);

// Public route - search tickets by phone number
router.get('/search/phone/:phone', optionalAuth, ticketController.searchByPhone);

// Protected routes
router.use(authenticate);

// Customer & Staff routes
router.get('/', paginationValidation, ticketController.getTickets);
router.get('/stats', ticketController.getTicketStats);
router.get('/:id', ticketIdValidation, ticketController.getTicketById);

// Create ticket with photo uploads
router.post('/', 
  uploadTicketPhotos.array('photos', 10),
  handleUploadError,
  createTicketValidation,
  ticketController.createTicket
);

// Technician & Admin routes
router.patch('/:id/status', 
  authorize('TECHNICIAN', 'ADMIN'),
  updateTicketStatusValidation, 
  ticketController.updateTicketStatus
);

router.patch('/:id/assign',
  authorize('TECHNICIAN', 'ADMIN'),
  ticketController.assignTechnician
);

// Transfer ticket to another technician
router.patch('/:id/transfer',
  authorize('TECHNICIAN', 'ADMIN'),
  ticketController.transferTechnician
);

router.post('/:id/notes',
  authorize('TECHNICIAN', 'ADMIN'),
  ticketController.addNote
);

router.post('/:id/photos',
  authorize('TECHNICIAN', 'ADMIN'),
  uploadTicketPhotos.array('photos', 10),
  handleUploadError,
  ticketController.addPhotos
);

// Admin only
router.delete('/:id',
  authorize('ADMIN'),
  ticketIdValidation,
  ticketController.deleteTicket
);

module.exports = router;
