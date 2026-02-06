/**
 * User Controller
 */

const { PrismaClient } = require('@prisma/client');
const { ApiError } = require('../middleware/error.middleware');

const prisma = new PrismaClient();

/**
 * Get all users (Admin only)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search, isActive, isApproved } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          isApproved: true,
          createdAt: true,
          _count: {
            select: {
              tickets: true,
              assignedTickets: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
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
 * Get all technicians
 */
exports.getTechnicians = async (req, res, next) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { 
        role: 'TECHNICIAN',
        isActive: true,
        isApproved: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    res.json({
      success: true,
      data: technicians
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tickets: true,
            assignedTickets: true
          }
        }
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user (general update - role, status, etc.)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, isActive, isApproved, firstName, lastName, phone } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Prevent changing own role
    if (role && id === req.user.id) {
      throw new ApiError(400, 'Cannot change your own role');
    }

    // Build update data
    const updateData = {};
    
    if (role && ['CUSTOMER', 'TECHNICIAN', 'ADMIN'].includes(role)) {
      updateData.role = role;
    }
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    if (typeof isApproved === 'boolean') {
      updateData.isApproved = isApproved;
    }
    if (firstName) {
      updateData.firstName = firstName;
    }
    if (lastName) {
      updateData.lastName = lastName;
    }
    if (phone) {
      updateData.phone = phone;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isApproved: true
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['CUSTOMER', 'TECHNICIAN', 'ADMIN'].includes(role)) {
      throw new ApiError(400, 'Invalid role');
    }

    // Prevent changing own role
    if (id === req.user.id) {
      throw new ApiError(400, 'Cannot change your own role');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active status
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deactivating own account
    if (id === req.user.id) {
      throw new ApiError(400, 'Cannot deactivate your own account');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    // If deactivating, invalidate all refresh tokens
    if (!updatedUser.isActive) {
      await prisma.refreshToken.deleteMany({
        where: { userId: id }
      });
    }

    res.json({
      success: true,
      message: updatedUser.isActive ? 'User activated' : 'User deactivated',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (id === req.user.id) {
      throw new ApiError(400, 'Cannot delete your own account');
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve user registration (Admin only)
 */
exports.approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // Optional role to assign

    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isApproved) {
      throw new ApiError(400, 'User is already approved');
    }

    // Validate role if provided
    const validRoles = ['CUSTOMER', 'TECHNICIAN', 'ADMIN'];
    const newRole = role && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : user.role;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        isApproved: true,
        role: newRole
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isApproved: true
      }
    });

    // TODO: Send email notification to user about approval

    res.json({
      success: true,
      message: `User ${updatedUser.firstName} ${updatedUser.lastName} has been approved as ${updatedUser.role}`,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject user registration (Admin only)
 */
exports.rejectUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isApproved) {
      throw new ApiError(400, 'Cannot reject an already approved user. Deactivate instead.');
    }

    // Delete the user (rejection removes the account)
    await prisma.user.delete({ where: { id } });

    // TODO: Send email notification to user about rejection with reason

    res.json({
      success: true,
      message: `User registration rejected${reason ? `: ${reason}` : ''}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending approval users (Admin only)
 */
exports.getPendingUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password (Admin only)
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Hash the new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    // Invalidate all refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: id }
    });

    res.json({
      success: true,
      message: 'Password reset successfully. User will need to log in again.'
    });
  } catch (error) {
    next(error);
  }
};