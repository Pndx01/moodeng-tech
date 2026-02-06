/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, rateLimit } = require('../middleware/auth.middleware');
const { registerValidation, loginValidation } = require('../middleware/validation.middleware');

// Public routes
router.post('/register', rateLimit(10, 60 * 60 * 1000), registerValidation, authController.register);
router.post('/login', rateLimit(5, 15 * 60 * 1000), loginValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', rateLimit(3, 60 * 60 * 1000), authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/me', authenticate, authController.updateProfile);
router.put('/me/password', authenticate, authController.changePassword);

module.exports = router;
