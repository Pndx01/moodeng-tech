/**
 * Socket.IO Setup
 * Real-time communication handlers
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Setup Socket.IO handlers
 */
const setupSocketIO = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, firstName: true, lastName: true, role: true }
        });
        
        if (user) {
          socket.user = user;
        }
      }
      
      next();
    } catch (error) {
      // Allow unauthenticated connections for public tracking
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join user's personal room if authenticated
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      console.log(`User ${socket.user.email} joined room user:${socket.user.id}`);

      // Staff members join the staff room
      if (['TECHNICIAN', 'ADMIN'].includes(socket.user.role)) {
        socket.join('staff');
        console.log(`Staff member ${socket.user.email} joined staff room`);
      }
    }

    // Subscribe to ticket updates
    socket.on('ticket:subscribe', (ticketNumber) => {
      socket.join(`ticket:${ticketNumber}`);
      console.log(`Socket ${socket.id} subscribed to ticket:${ticketNumber}`);
    });

    // Unsubscribe from ticket updates
    socket.on('ticket:unsubscribe', (ticketNumber) => {
      socket.leave(`ticket:${ticketNumber}`);
      console.log(`Socket ${socket.id} unsubscribed from ticket:${ticketNumber}`);
    });

    // Handle typing indicator (for future chat feature)
    socket.on('typing:start', (data) => {
      socket.to(`ticket:${data.ticketNumber}`).emit('typing:started', {
        user: socket.user?.firstName || 'Someone',
        ticketNumber: data.ticketNumber
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`ticket:${data.ticketNumber}`).emit('typing:stopped', {
        ticketNumber: data.ticketNumber
      });
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error: ${socket.id}`, error);
    });
  });

  return io;
};

/**
 * Utility to emit notifications
 */
const emitNotification = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Utility to emit ticket updates
 */
const emitTicketUpdate = (io, ticketNumber, update) => {
  io.to(`ticket:${ticketNumber}`).emit('ticket:updated', update);
};

/**
 * Broadcast to all staff members
 */
const notifyStaff = (io, event, data) => {
  io.to('staff').emit(event, data);
};

module.exports = { 
  setupSocketIO, 
  emitNotification, 
  emitTicketUpdate, 
  notifyStaff 
};
