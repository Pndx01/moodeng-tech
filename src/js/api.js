/**
 * API Client
 * Handles all HTTP requests to the backend with automatic token refresh
 */

class ApiClient {
  constructor() {
    // Use API_CONFIG if available, otherwise default to /api
    this.baseUrl = (typeof API_CONFIG !== 'undefined') ? API_CONFIG.BASE_URL : '/api';
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  /**
   * Get stored tokens
   */
  getTokens() {
    const session = localStorage.getItem('userSession');
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }

  /**
   * Store tokens
   */
  setTokens(data) {
    const existing = this.getTokens() || {};
    const session = {
      ...existing,
      ...data,
      loginTime: existing.loginTime || new Date().toISOString()
    };
    localStorage.setItem('userSession', JSON.stringify(session));
  }

  /**
   * Clear tokens and session
   */
  clearTokens() {
    localStorage.removeItem('userSession');
  }

  /**
   * Get access token
   */
  getAccessToken() {
    const tokens = this.getTokens();
    return tokens?.accessToken;
  }

  /**
   * Get refresh token
   */
  getRefreshToken() {
    const tokens = this.getTokens();
    return tokens?.refreshToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getAccessToken();
  }

  /**
   * Get current user from session
   */
  getCurrentUser() {
    const tokens = this.getTokens();
    return tokens?.user;
  }

  /**
   * Subscribe to token refresh
   */
  subscribeToRefresh(callback) {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notify subscribers after refresh
   */
  onRefreshComplete(error = null, token = null) {
    this.refreshSubscribers.forEach(callback => callback(error, token));
    this.refreshSubscribers = [];
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.subscribeToRefresh((error, token) => {
          if (error) reject(error);
          else resolve(token);
        });
      });
    }

    this.isRefreshing = true;
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.isRefreshing = false;
      throw new Error('No refresh token');
    }

    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.data);
      this.isRefreshing = false;
      this.onRefreshComplete(null, data.data.accessToken);
      return data.data.accessToken;
    } catch (error) {
      this.isRefreshing = false;
      this.clearTokens();
      this.onRefreshComplete(error);
      throw error;
    }
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...options.headers
    };

    // Add auth header if token exists
    const token = this.getAccessToken();
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add content type for JSON
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const config = {
      ...options,
      headers
    };

    try {
      let response = await fetch(url, config);

      // Check if this is an auth endpoint (login/register) - don't try to refresh tokens for these
      const isAuthEndpoint = endpoint.includes('/login') || endpoint.includes('/register');

      // Handle token expiration (but not for auth endpoints)
      if (response.status === 401 && !options.skipAuth && !options.isRetry && !isAuthEndpoint) {
        try {
          await this.refreshAccessToken();
          // Retry request with new token
          headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
          response = await fetch(url, { ...config, headers, isRetry: true });
        } catch (refreshError) {
          // Refresh failed, redirect to login (but only if not already on login page)
          const currentPage = window.location.pathname.split('/').pop();
          if (currentPage !== 'login.html') {
            window.location.href = 'login.html';
          }
          throw new Error('Session expired');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        error.status = response.status;
        error.errors = data.errors;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError') {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }

  // HTTP method shortcuts
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, body = null, options = {}) {
    const config = { ...options, method: 'DELETE' };
    if (body) {
      config.body = body;
    }
    return this.request(endpoint, config);
  }

  /**
   * Upload files
   */
  async upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData
    });
  }
}

// Create singleton instance
const api = new ApiClient();

// Make available globally
window.api = api;
