/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { paginationValidation } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/', authorize('ADMIN'), paginationValidation, userController.getUsers);
router.get('/pending', authorize('ADMIN'), userController.getPendingUsers);
// Technicians list - accessible by both ADMIN and TECHNICIAN for ticket assignment
router.get('/technicians', authorize('ADMIN', 'TECHNICIAN'), userController.getTechnicians);
router.get('/:id', authorize('ADMIN'), userController.getUserById);
router.patch('/:id', authorize('ADMIN'), userController.updateUser);
router.patch('/:id/role', authorize('ADMIN'), userController.updateUserRole);
router.patch('/:id/status', authorize('ADMIN'), userController.toggleUserStatus);
router.patch('/:id/approve', authorize('ADMIN'), userController.approveUser);
router.patch('/:id/reset-password', authorize('ADMIN'), userController.resetPassword);
router.delete('/:id/reject', authorize('ADMIN'), userController.rejectUser);
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

module.exports = router;
