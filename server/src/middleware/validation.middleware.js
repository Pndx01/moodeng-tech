/**
 * Validation Middleware
 * Input validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { ApiError } = require('./error.middleware');

// Process validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    
    throw new ApiError(400, 'Validation failed', formattedErrors);
  }
  
  next();
};

// Auth validations
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name too long'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name too long'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  validate
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

// Ticket validations
const createTicketValidation = [
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required'),
  body('customerEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid customer email is required'),
  body('customerPhone')
    .notEmpty()
    .withMessage('Customer phone is required'),
  body('deviceType')
    .trim()
    .notEmpty()
    .withMessage('Device type is required'),
  body('deviceBrand')
    .trim()
    .notEmpty()
    .withMessage('Device brand is required'),
  body('deviceModel')
    .trim()
    .notEmpty()
    .withMessage('Device model is required'),
  body('issueDescription')
    .trim()
    .notEmpty()
    .withMessage('Issue description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Issue description must be 10-2000 characters'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  validate
];

const updateTicketStatusValidation = [
  param('id')
    .notEmpty()
    .withMessage('Ticket ID is required'),
  body('status')
    .isIn(['RECEIVED', 'DIAGNOSED', 'WAITING_PARTS', 'IN_PROGRESS', 'READY', 'COMPLETED', 'RETURNED', 'CANCELLED'])
    .withMessage('Invalid status'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  validate
];

const ticketIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Ticket ID is required'),
  validate
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createTicketValidation,
  updateTicketStatusValidation,
  ticketIdValidation,
  paginationValidation
};
