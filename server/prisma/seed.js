/**
 * Database seed file
 * Creates demo users and sample tickets
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const techPassword = await bcrypt.hash('tech123', 12);
  const customerPassword = await bcrypt.hash('customer123', 12);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@moodengtech.com' },
    update: {},
    create: {
      email: 'admin@moodengtech.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+66-812-345-678',
      role: 'ADMIN',
      isApproved: true
    }
  });
  console.log(`Admin created: ${admin.email}`);

  // Create Technician
  const technician = await prisma.user.upsert({
    where: { email: 'tech@moodengtech.com' },
    update: {},
    create: {
      email: 'tech@moodengtech.com',
      password: techPassword,
      firstName: 'John',
      lastName: 'Technician',
      phone: '+66-823-456-789',
      role: 'TECHNICIAN',
      isApproved: true
    }
  });
  console.log(`Technician created: ${technician.email}`);

  // Create Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      firstName: 'Jane',
      lastName: 'Customer',
      phone: '+66-834-567-890',
      role: 'CUSTOMER',
      isApproved: true
    }
  });
  console.log(`Customer created: ${customer.email}`);

  // Create sample tickets
  const sampleTickets = [
    {
      ticketNumber: 'MOO-2026-0001',
      customerId: customer.id,
      customerName: 'Jane Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+66-834-567-890',
      deviceType: 'Laptop',
      deviceBrand: 'Dell',
      deviceModel: 'XPS 15',
      serialNumber: 'DELL-XPS-001',
      issueDescription: 'Screen flickering issue when running graphics-intensive applications. The problem started after a recent Windows update.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      technicianId: technician.id,
      estimatedCost: 150.00
    },
    {
      ticketNumber: 'MOO-2026-0002',
      customerId: customer.id,
      customerName: 'Jane Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+66-834-567-890',
      deviceType: 'Laptop',
      deviceBrand: 'Apple',
      deviceModel: 'MacBook Pro 14"',
      serialNumber: 'APPLE-MBP-002',
      issueDescription: 'Battery draining very fast, only lasts about 2 hours. Device is 2 years old.',
      priority: 'MEDIUM',
      status: 'DIAGNOSED',
      technicianId: technician.id,
      estimatedCost: 250.00
    },
    {
      ticketNumber: 'MOO-2026-0003',
      customerId: customer.id,
      customerName: 'Jane Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+66-834-567-890',
      deviceType: 'Laptop',
      deviceBrand: 'Lenovo',
      deviceModel: 'ThinkPad X1 Carbon',
      serialNumber: 'LEN-X1C-003',
      issueDescription: 'Keyboard not working properly, several keys unresponsive.',
      priority: 'HIGH',
      status: 'READY',
      technicianId: technician.id,
      estimatedCost: 120.00
    },
    {
      ticketNumber: 'MOO-2026-0004',
      customerId: customer.id,
      customerName: 'Jane Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+66-834-567-890',
      deviceType: 'Desktop',
      deviceBrand: 'HP',
      deviceModel: 'Pavilion Gaming',
      issueDescription: 'Computer not booting, showing blue screen errors.',
      priority: 'URGENT',
      status: 'RECEIVED'
    }
  ];

  for (const ticketData of sampleTickets) {
    const existingTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: ticketData.ticketNumber }
    });

    if (!existingTicket) {
      const ticket = await prisma.ticket.create({
        data: ticketData
      });

      // Create timeline entries based on status
      const timelineEntries = [];
      
      timelineEntries.push({
        ticketId: ticket.id,
        status: 'RECEIVED',
        description: 'Device received at service center',
        createdBy: admin.id
      });

      if (['DIAGNOSED', 'WAITING_PARTS', 'IN_PROGRESS', 'READY', 'COMPLETED'].includes(ticket.status)) {
        timelineEntries.push({
          ticketId: ticket.id,
          status: 'DIAGNOSED',
          description: 'Device diagnosed, issue identified',
          createdBy: technician.id
        });
      }

      if (['IN_PROGRESS', 'READY', 'COMPLETED'].includes(ticket.status)) {
        timelineEntries.push({
          ticketId: ticket.id,
          status: 'IN_PROGRESS',
          description: 'Repair work started',
          createdBy: technician.id
        });
      }

      if (['READY', 'COMPLETED'].includes(ticket.status)) {
        timelineEntries.push({
          ticketId: ticket.id,
          status: 'READY',
          description: 'Repair completed, ready for pickup',
          createdBy: technician.id
        });
      }

      await prisma.ticketTimeline.createMany({
        data: timelineEntries
      });

      console.log(`Ticket created: ${ticket.ticketNumber}`);
    }
  }

  console.log('\nSeed completed successfully!');
  console.log('\nDemo accounts:');
  console.log('  Admin: admin@moodengtech.com / admin123');
  console.log('  Technician: tech@moodengtech.com / tech123');
  console.log('  Customer: customer@example.com / customer123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
