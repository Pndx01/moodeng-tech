/**
 * Ticket Controller
 */

const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../middleware/error.middleware');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

/**
 * Generate ticket number
 */
const generateTicketNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `MOO-${year}-`;
  
  // Get the last ticket number for this year
  const lastTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: { startsWith: prefix }
    },
    orderBy: { ticketNumber: 'desc' }
  });

  let nextNumber = 1;
  if (lastTicket) {
    const lastNumber = parseInt(lastTicket.ticketNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Create a new ticket
 */
exports.createTicket = async (req, res, next) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      deviceType,
      deviceBrand,
      deviceModel,
      serialNumber,
      issueDescription,
      priority = 'MEDIUM',
      technicianId
    } = req.body;

    const ticketNumber = await generateTicketNumber();

    // Create ticket with timeline entry
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        customerId: req.user.id,
        customerName,
        customerEmail,
        customerPhone,
        deviceType,
        deviceBrand,
        deviceModel,
        serialNumber,
        issueDescription,
        priority,
        status: 'RECEIVED',
        technicianId: technicianId || null,
        timeline: {
          create: {
            status: 'RECEIVED',
            description: 'Ticket created and device received',
            createdBy: req.user.id
          }
        }
      },
      include: {
        timeline: true,
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Handle photo uploads (with RECEIVED stage for initial photos)
    if (req.files && req.files.length > 0) {
      const photoData = req.files.map(file => ({
        ticketId: ticket.id,
        filename: file.filename,
        path: `/uploads/tickets/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        stage: 'RECEIVED'
      }));

      await prisma.ticketPhoto.createMany({ data: photoData });
    }

    // Fetch complete ticket with photos
    const completeTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        timeline: { orderBy: { createdAt: 'desc' } },
        photos: true
      }
    });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:created', {
        ticketNumber: completeTicket.ticketNumber,
        status: completeTicket.status
      });
    }

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: completeTicket
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tickets with filtering and pagination
 */
exports.getTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, priority, search, assignedToMe } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};
    
    // Customers can see tickets created for them (by customerId) OR matching their phone number
    if (req.user.role === 'CUSTOMER') {
      const customerPhone = req.user.phone;
      if (customerPhone) {
        where.OR = [
          { customerId: req.user.id },
          { customerPhone: customerPhone }
        ];
      } else {
        where.customerId = req.user.id;
      }
    }

    // Technicians: if assignedToMe=true, only show their assigned tickets
    if (req.user.role === 'TECHNICIAN' && assignedToMe === 'true') {
      where.technicianId = req.user.id;
    }
    
    // Admins can always see all tickets

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      // For customers with phone matching, we need to handle search differently
      if (req.user.role === 'CUSTOMER' && where.OR) {
        where.AND = [
          { OR: where.OR },
          {
            OR: [
              { ticketNumber: { contains: search } },
              { customerName: { contains: search } },
              { deviceBrand: { contains: search } },
              { deviceModel: { contains: search } }
            ]
          }
        ];
        delete where.OR;
      } else {
        where.OR = [
          { ticketNumber: { contains: search } },
          { customerName: { contains: search } },
          { customerEmail: { contains: search } },
          { deviceBrand: { contains: search } },
          { deviceModel: { contains: search } }
        ];
      }
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          timeline: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          technician: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      }),
      prisma.ticket.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket statistics
 */
exports.getTicketStats = async (req, res, next) => {
  try {
    const where = {};
    
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (req.user.role === 'TECHNICIAN') {
      where.technicianId = req.user.id;
    }

    const [total, active, completed, byStatus] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ 
        where: { 
          ...where, 
          status: { notIn: ['COMPLETED', 'CANCELLED'] } 
        } 
      }),
      prisma.ticket.count({ 
        where: { ...where, status: 'COMPLETED' } 
      }),
      prisma.ticket.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      })
    ]);

    const statusCounts = {};
    byStatus.forEach(item => {
      statusCounts[item.status] = item._count.status;
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        completed,
        cancelled: statusCounts.CANCELLED || 0,
        byStatus: statusCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single ticket by ID
 */
exports.getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        timeline: { orderBy: { createdAt: 'asc' } },
        photos: true,
        notes: req.user.role !== 'CUSTOMER' ? true : { where: { isPrivate: false } },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        technician: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Customers can only view their own tickets
    if (req.user.role === 'CUSTOMER' && ticket.customerId !== req.user.id) {
      throw new ApiError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track ticket by ticket number (public with optional auth)
 * - Without auth: Shows repair progress only (no customer info, photos)
 * - With auth + matching phone: Shows full details including photos and customer info
 */
exports.trackTicket = async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;

    // First, fetch basic ticket info
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: ticketNumber.toUpperCase() },
      select: {
        ticketNumber: true,
        status: true,
        deviceType: true,
        deviceBrand: true,
        deviceModel: true,
        issueDescription: true,
        priority: true,
        estimatedCompletion: true,
        createdAt: true,
        customerId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        technician: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        timeline: {
          orderBy: { createdAt: 'asc' },
          select: {
            status: true,
            description: true,
            createdAt: true
          }
        },
        photos: {
          select: {
            id: true,
            filename: true,
            path: true,
            stage: true,
            createdAt: true
          }
        }
      }
    });

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found. Please check your ticket number.');
    }

    // Check if user is authenticated and authorized to see sensitive data
    const isAuthenticated = !!req.user;
    let canViewSensitiveData = false;

    console.log('=== Track Ticket Debug ===');
    console.log('Is authenticated:', isAuthenticated);
    console.log('User:', req.user);

    if (isAuthenticated) {
      // User is logged in - check if they can see sensitive data
      // Admin and Technician can always see all data
      if (req.user.role === 'ADMIN' || req.user.role === 'TECHNICIAN') {
        canViewSensitiveData = true;
        console.log('Admin/Tech - can view all');
      } 
      // Customer can see data if ticket belongs to them (by customerId) 
      // OR if their phone number matches the ticket's customer phone
      else if (req.user.role === 'CUSTOMER') {
        // Get user's phone number from database
        const userDetails = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { phone: true }
        });
        
        const userPhone = userDetails?.phone;
        const ticketCustomerId = ticket.customerId;
        const ticketPhone = ticket.customerPhone;
        
        console.log('Customer check:');
        console.log('  User ID:', req.user.id);
        console.log('  User Phone:', userPhone);
        console.log('  Ticket CustomerId:', ticketCustomerId);
        console.log('  Ticket Phone:', ticketPhone);
        
        // Match by customerId or phone number
        if (ticketCustomerId === req.user.id) {
          canViewSensitiveData = true;
          console.log('  Matched by customerId');
        } else if (userPhone && ticketPhone) {
          // Normalize phone numbers for comparison (remove non-digits)
          const normalizedUserPhone = userPhone.replace(/\D/g, '');
          const normalizedTicketPhone = ticketPhone.replace(/\D/g, '');
          console.log('  Normalized User Phone:', normalizedUserPhone);
          console.log('  Normalized Ticket Phone:', normalizedTicketPhone);
          if (normalizedUserPhone === normalizedTicketPhone) {
            canViewSensitiveData = true;
            console.log('  Matched by phone');
          }
        }
      }
    }
    
    console.log('Can view sensitive data:', canViewSensitiveData);
    console.log('=========================');

    // Build response based on authorization level
    const response = {
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      deviceType: ticket.deviceType,
      deviceBrand: ticket.deviceBrand,
      deviceModel: ticket.deviceModel,
      issueDescription: ticket.issueDescription,
      priority: ticket.priority,
      estimatedCompletion: ticket.estimatedCompletion,
      createdAt: ticket.createdAt,
      technicianName: ticket.technician 
        ? `${ticket.technician.firstName} ${ticket.technician.lastName}`
        : null,
      timeline: ticket.timeline,
      // Flag to indicate if user can see sensitive data
      canViewSensitiveData: canViewSensitiveData
    };

    // Include sensitive data only if authorized
    if (canViewSensitiveData) {
      response.customerName = ticket.customerName;
      response.customerEmail = ticket.customerEmail;
      response.customerPhone = ticket.customerPhone;
      response.photos = ticket.photos;
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search tickets by phone number (public with optional auth)
 * Returns all tickets matching the phone number
 */
exports.searchByPhone = async (req, res, next) => {
  try {
    const { phone } = req.params;
    
    // Normalize phone number - remove all non-digits
    const normalizedPhone = phone.replace(/\D/g, '');
    
    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid phone number (at least 10 digits)');
    }

    // Search for tickets with matching phone number
    const tickets = await prisma.ticket.findMany({
      where: {
        customerPhone: {
          contains: normalizedPhone
        }
      },
      select: {
        ticketNumber: true,
        status: true,
        deviceType: true,
        deviceBrand: true,
        deviceModel: true,
        issueDescription: true,
        priority: true,
        estimatedCompletion: true,
        createdAt: true,
        customerId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        technician: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        timeline: {
          orderBy: { createdAt: 'asc' },
          select: {
            status: true,
            description: true,
            createdAt: true
          }
        },
        photos: {
          select: {
            id: true,
            filename: true,
            path: true,
            stage: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (tickets.length === 0) {
      throw new ApiError(404, 'No tickets found for this phone number');
    }

    // Check if user is authenticated and authorized to see sensitive data
    const isAuthenticated = !!req.user;
    let canViewSensitiveData = false;

    if (isAuthenticated) {
      if (req.user.role === 'ADMIN' || req.user.role === 'TECHNICIAN') {
        canViewSensitiveData = true;
      } else if (req.user.role === 'CUSTOMER') {
        // Get user's phone number from database
        const userDetails = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { phone: true }
        });
        
        const userPhone = userDetails?.phone?.replace(/\D/g, '');
        if (userPhone && userPhone === normalizedPhone) {
          canViewSensitiveData = true;
        }
      }
    }

    // Build response based on authorization level
    const response = tickets.map(ticket => {
      const ticketResponse = {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        deviceType: ticket.deviceType,
        deviceBrand: ticket.deviceBrand,
        deviceModel: ticket.deviceModel,
        issueDescription: ticket.issueDescription,
        priority: ticket.priority,
        estimatedCompletion: ticket.estimatedCompletion,
        createdAt: ticket.createdAt,
        technicianName: ticket.technician 
          ? `${ticket.technician.firstName} ${ticket.technician.lastName}`
          : null,
        timeline: ticket.timeline,
        canViewSensitiveData: canViewSensitiveData
      };

      if (canViewSensitiveData) {
        ticketResponse.customerName = ticket.customerName;
        ticketResponse.customerEmail = ticket.customerEmail;
        ticketResponse.customerPhone = ticket.customerPhone;
        ticketResponse.photos = ticket.photos;
      }

      return ticketResponse;
    });

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket status
 */
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, description, estimatedCost, estimatedCompletion, warrantyDays } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    
    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Calculate warranty expiration date if completing with warranty
    let warrantyExpires = undefined;
    let warrantyDaysValue = undefined;
    
    if (status === 'COMPLETED' && warrantyDays && parseInt(warrantyDays) > 0) {
      warrantyDaysValue = parseInt(warrantyDays);
      warrantyExpires = new Date();
      warrantyExpires.setDate(warrantyExpires.getDate() + warrantyDaysValue);
    }

    // Update ticket and add timeline entry
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        estimatedCost,
        estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        warrantyDays: warrantyDaysValue,
        warrantyExpires: warrantyExpires,
        timeline: {
          create: {
            status,
            description: description || `Status updated to ${status}${warrantyDaysValue ? ` with ${warrantyDaysValue} days warranty` : ''}`,
            createdBy: req.user.id
          }
        }
      },
      include: {
        timeline: { orderBy: { createdAt: 'desc' } },
        customer: { select: { id: true, email: true, firstName: true } }
      }
    });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket:${ticket.ticketNumber}`).emit('ticket:updated', {
        ticketNumber: ticket.ticketNumber,
        status,
        description,
        updatedAt: new Date()
      });

      // Notify customer
      io.to(`user:${ticket.customerId}`).emit('notification', {
        type: 'TICKET_UPDATED',
        title: 'Ticket Status Updated',
        message: `Your ticket ${ticket.ticketNumber} status is now: ${status}`,
        ticketNumber: ticket.ticketNumber
      });
    }

    // Create notification in database
    await prisma.notification.create({
      data: {
        userId: ticket.customerId,
        type: 'TICKET_UPDATED',
        title: 'Ticket Status Updated',
        message: `Your ticket ${ticket.ticketNumber} status has been updated to ${status}`,
        metadata: { ticketId: id, ticketNumber: ticket.ticketNumber, status }
      }
    });

    res.json({
      success: true,
      message: 'Ticket status updated',
      data: updatedTicket
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign technician to ticket
 */
exports.assignTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { technicianId } = req.body;

    // Verify technician exists and has correct role
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { id: true, role: true, firstName: true, lastName: true }
    });

    if (!technician || !['TECHNICIAN', 'ADMIN'].includes(technician.role)) {
      throw new ApiError(400, 'Invalid technician');
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { 
        technicianId,
        timeline: {
          create: {
            status: 'IN_PROGRESS',
            description: `Ticket assigned to ${technician.firstName} ${technician.lastName}`,
            createdBy: req.user.id
          }
        }
      },
      include: {
        technician: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json({
      success: true,
      message: `Ticket assigned to ${technician.firstName} ${technician.lastName}`,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transfer ticket to another technician
 */
exports.transferTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { technicianId, reason } = req.body;

    // Get current ticket
    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        technician: { select: { firstName: true, lastName: true } }
      }
    });

    if (!currentTicket) {
      throw new ApiError(404, 'Ticket not found');
    }

    const previousTechName = currentTicket.technician 
      ? `${currentTicket.technician.firstName} ${currentTicket.technician.lastName}`
      : 'Unassigned';

    // Verify new technician exists and has correct role
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { id: true, role: true, firstName: true, lastName: true }
    });

    if (!technician || !['TECHNICIAN', 'ADMIN'].includes(technician.role)) {
      throw new ApiError(400, 'Invalid technician');
    }

    const newTechName = `${technician.firstName} ${technician.lastName}`;
    const transferNote = reason 
      ? `Transferred from ${previousTechName} to ${newTechName}. Reason: ${reason}`
      : `Transferred from ${previousTechName} to ${newTechName}`;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { 
        technicianId,
        timeline: {
          create: {
            status: currentTicket.status,
            description: transferNote,
            createdBy: req.user.id
          }
        }
      },
      include: {
        technician: { select: { id: true, firstName: true, lastName: true } },
        timeline: { orderBy: { createdAt: 'desc' } }
      }
    });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket:${currentTicket.ticketNumber}`).emit('ticket:transferred', {
        ticketNumber: currentTicket.ticketNumber,
        fromTechnician: previousTechName,
        toTechnician: newTechName,
        reason: reason || null
      });
    }

    res.json({
      success: true,
      message: `Ticket transferred to ${newTechName}`,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add note to ticket
 */
exports.addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isPrivate = true } = req.body;

    const note = await prisma.ticketNote.create({
      data: {
        ticketId: id,
        content,
        isPrivate,
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Note added',
      data: note
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add photos to ticket with stage
 */
exports.addPhotos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage = 'RECEIVED' } = req.body;

    // Validate stage
    const validStages = ['RECEIVED', 'DURING_REPAIR', 'REPAIRED'];
    if (!validStages.includes(stage)) {
      throw new ApiError(400, `Invalid stage. Must be one of: ${validStages.join(', ')}`);
    }

    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'No photos uploaded');
    }

    // Limit to 3 photos per stage
    const existingPhotos = await prisma.ticketPhoto.count({
      where: { ticketId: id, stage }
    });

    if (existingPhotos + req.files.length > 3) {
      throw new ApiError(400, `Maximum 3 photos per stage. You have ${existingPhotos} and trying to add ${req.files.length}.`);
    }

    const photoData = req.files.map(file => ({
      ticketId: id,
      filename: file.filename,
      path: `/uploads/tickets/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      stage
    }));

    await prisma.ticketPhoto.createMany({ data: photoData });

    // Add timeline entry for photo addition
    const stageLabels = {
      'RECEIVED': 'Received',
      'DURING_REPAIR': 'During Repair',
      'REPAIRED': 'Repaired'
    };

    await prisma.ticketTimeline.create({
      data: {
        ticketId: id,
        status: stage === 'REPAIRED' ? 'READY' : 'IN_PROGRESS',
        description: `${req.files.length} photo(s) added for "${stageLabels[stage]}" stage`,
        createdBy: req.user.id
      }
    });

    const photos = await prisma.ticketPhoto.findMany({
      where: { ticketId: id },
      orderBy: [{ stage: 'asc' }, { createdAt: 'asc' }]
    });

    res.status(201).json({
      success: true,
      message: `${req.files.length} photo(s) added to ${stageLabels[stage]} stage`,
      data: photos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete ticket (Admin only)
 */
exports.deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get photos to delete files
    const photos = await prisma.ticketPhoto.findMany({
      where: { ticketId: id }
    });

    // Delete ticket (cascade deletes related records)
    await prisma.ticket.delete({ where: { id } });

    // Delete photo files
    photos.forEach(photo => {
      const filePath = path.join(__dirname, '../../uploads/tickets', photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
