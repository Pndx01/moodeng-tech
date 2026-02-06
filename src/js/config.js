/**
 * API Configuration
 * Central configuration for API endpoints and settings
 */

// Use absolute URL to Node.js server
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api',
  WS_URL: 'http://localhost:3000',
  TIMEOUT: 30000,
  
  // Endpoints
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/me/password',
    
    // Tickets
    TICKETS: '/tickets',
    TICKET_STATS: '/tickets/stats',
    TICKET_TRACK: '/tickets/track',
    
    // Users
    USERS: '/users',
    USERS_PENDING: '/users/pending',
    TECHNICIANS: '/users/technicians',
    
    // Notifications
    NOTIFICATIONS: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count'
  }
};

// Make available globally
window.API_CONFIG = API_CONFIG;
