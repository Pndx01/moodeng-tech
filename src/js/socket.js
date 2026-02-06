/**
 * Socket Client
 * Handles real-time WebSocket connections
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket && this.connected) {
      return;
    }

    // Load Socket.IO from CDN if not loaded
    if (typeof io === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
      script.onload = () => this.initSocket();
      document.head.appendChild(script);
    } else {
      this.initSocket();
    }
  }

  /**
   * Initialize socket connection
   */
  initSocket() {
    const token = api.getAccessToken();
    
    this.socket = io(API_CONFIG.WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connectionChange', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
      this.emit('connectionChange', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
    });

    // Forward all socket events to local listeners
    this.socket.onAny((event, ...args) => {
      this.emit(event, ...args);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Subscribe to ticket updates
   */
  subscribeToTicket(ticketNumber) {
    if (this.socket && this.connected) {
      this.socket.emit('ticket:subscribe', ticketNumber);
    }
  }

  /**
   * Unsubscribe from ticket updates
   */
  unsubscribeFromTicket(ticketNumber) {
    if (this.socket && this.connected) {
      this.socket.emit('ticket:unsubscribe', ticketNumber);
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit to local listeners
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in socket listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send event to server
   */
  send(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }
}

// Create singleton instance
const socketClient = new SocketClient();

// Make available globally
window.socketClient = socketClient;
