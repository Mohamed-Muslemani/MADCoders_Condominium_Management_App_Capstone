import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL?.trim();
  const password = process.env.PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      'DEFAULT_ADMIN_EMAIL and PASSWORD must be set before running the seed',
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: 'Default',
      lastName: 'Admin',
      role: 'ADMIN',
      active: true,
    },
    create: {
      email,
      passwordHash,
      firstName: 'Default',
      lastName: 'Admin',
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Admin created');
  return admin;
}

async function seedDemoData(adminUserId: string) {
  const existingUnits = await prisma.unit.count();

  if (existingUnits > 0) {
    console.log('Skipping demo seed (already exists)');
    return;
  }

  const password = process.env.PASSWORD?.trim();

  if (!password) {
    throw new Error('PASSWORD must be set before running the seed');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const ownerOne = await prisma.user.upsert({
    where: { email: 'owner.one@example.com' },
    update: {
      firstName: 'Olivia',
      lastName: 'Owner',
      phone: '416-555-0101',
      role: 'OWNER',
      active: true,
      passwordHash,
    },
    create: {
      email: 'owner.one@example.com',
      passwordHash,
      firstName: 'Olivia',
      lastName: 'Owner',
      phone: '416-555-0101',
      role: 'OWNER',
      active: true,
    },
  });

  const ownerTwo = await prisma.user.upsert({
    where: { email: 'owner.two@example.com' },
    update: {
      firstName: 'Noah',
      lastName: 'Owner',
      phone: '416-555-0102',
      role: 'OWNER',
      active: true,
      passwordHash,
    },
    create: {
      email: 'owner.two@example.com',
      passwordHash,
      firstName: 'Noah',
      lastName: 'Owner',
      phone: '416-555-0102',
      role: 'OWNER',
      active: true,
    },
  });

  const ownerThree = await prisma.user.upsert({
    where: { email: 'owner.three@example.com' },
    update: {
      firstName: 'Emma',
      lastName: 'Owner',
      phone: '416-555-0103',
      role: 'OWNER',
      active: true,
      passwordHash,
    },
    create: {
      email: 'owner.three@example.com',
      passwordHash,
      firstName: 'Emma',
      lastName: 'Owner',
      phone: '416-555-0103',
      role: 'OWNER',
      active: true,
    },
  });

  const unit101 = await prisma.unit.upsert({
    where: { unitNumber: '101' },
    update: {
      unitType: '1 Bedroom',
      floor: 1,
      bedrooms: 1,
      bathrooms: '1.00',
      squareFeet: 680,
      parkingSpots: 1,
      monthlyFee: '420.00',
      status: 'ACTIVE',
      notes: 'Garden-facing starter unit',
    },
    create: {
      unitNumber: '101',
      unitType: '1 Bedroom',
      floor: 1,
      bedrooms: 1,
      bathrooms: '1.00',
      squareFeet: 680,
      parkingSpots: 1,
      monthlyFee: '420.00',
      status: 'ACTIVE',
      notes: 'Garden-facing starter unit',
    },
  });

  const unit202 = await prisma.unit.upsert({
    where: { unitNumber: '202' },
    update: {
      unitType: '2 Bedroom',
      floor: 2,
      bedrooms: 2,
      bathrooms: '2.00',
      squareFeet: 940,
      parkingSpots: 1,
      monthlyFee: '560.00',
      status: 'ACTIVE',
      notes: 'Corner unit with balcony',
    },
    create: {
      unitNumber: '202',
      unitType: '2 Bedroom',
      floor: 2,
      bedrooms: 2,
      bathrooms: '2.00',
      squareFeet: 940,
      parkingSpots: 1,
      monthlyFee: '560.00',
      status: 'ACTIVE',
      notes: 'Corner unit with balcony',
    },
  });

  const unit303 = await prisma.unit.upsert({
    where: { unitNumber: '303' },
    update: {
      unitType: '3 Bedroom',
      floor: 3,
      bedrooms: 3,
      bathrooms: '2.00',
      squareFeet: 1210,
      parkingSpots: 2,
      monthlyFee: '710.00',
      status: 'ACTIVE',
      notes: 'Top-floor family unit',
    },
    create: {
      unitNumber: '303',
      unitType: '3 Bedroom',
      floor: 3,
      bedrooms: 3,
      bathrooms: '2.00',
      squareFeet: 1210,
      parkingSpots: 2,
      monthlyFee: '710.00',
      status: 'ACTIVE',
      notes: 'Top-floor family unit',
    },
  });

  await prisma.unitOwner.createMany({
    data: [
      {
        unitId: unit101.unitId,
        userId: ownerOne.userId,
        startDate: new Date('2025-01-01'),
      },
      {
        unitId: unit202.unitId,
        userId: ownerTwo.userId,
        startDate: new Date('2025-02-01'),
      },
      {
        unitId: unit303.unitId,
        userId: ownerThree.userId,
        startDate: new Date('2025-03-01'),
      },
    ],
  });

  await prisma.unitDue.upsert({
    where: {
      unitId_periodMonth: {
        unitId: unit101.unitId,
        periodMonth: new Date('2026-04-01'),
      },
    },
    update: {
      dueDate: new Date('2026-04-05'),
      paidDate: new Date('2026-04-02'),
      amount: '420.00',
      status: 'PAID',
      note: 'Paid by bank transfer',
      updatedByUserId: adminUserId,
      updatedAt: new Date(),
    },
    create: {
      unitId: unit101.unitId,
      periodMonth: new Date('2026-04-01'),
      dueDate: new Date('2026-04-05'),
      paidDate: new Date('2026-04-02'),
      amount: '420.00',
      status: 'PAID',
      note: 'Paid by bank transfer',
      updatedByUserId: adminUserId,
      updatedAt: new Date(),
    },
  });

  await prisma.unitDue.upsert({
    where: {
      unitId_periodMonth: {
        unitId: unit202.unitId,
        periodMonth: new Date('2026-04-01'),
      },
    },
    update: {
      dueDate: new Date('2026-04-05'),
      amount: '560.00',
      status: 'UNPAID',
      note: 'Awaiting payment',
      updatedByUserId: adminUserId,
      updatedAt: new Date(),
    },
    create: {
      unitId: unit202.unitId,
      periodMonth: new Date('2026-04-01'),
      dueDate: new Date('2026-04-05'),
      amount: '560.00',
      status: 'UNPAID',
      note: 'Awaiting payment',
      updatedByUserId: adminUserId,
      updatedAt: new Date(),
    },
  });

  await prisma.unitDue.upsert({
    where: {
      unitId_periodMonth: {
        unitId: unit303.unitId,
        periodMonth: new Date('2026-04-01'),
      },
    },
    update: {
      dueDate: new Date('2026-04-05'),
      amount: '710.00',
      status: 'WAIVED',
      note: 'Promotional waiver for move-in issue',
      updatedByUserId: adminUserId,
      updatedAt: new Date(),
    },
    create: {
      unitId: unit303.unitId,
      periodMonth: new Date('2026-04-01'),
      dueDate: new Date('2026-04-05'),
      amount: '710.00',
      status: 'WAIVED',
      note: 'Promotional waiver for move-in issue',
      updatedByUserId: adminUserId,
      updatedAt: new Date(),
    },
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: 'Spring Fire Alarm Test',
        content:
          'The building-wide fire alarm inspection will take place on April 15 between 10:00 AM and 1:00 PM.',
        pinned: true,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-04-05T09:00:00Z'),
        createdByUserId: adminUserId,
      },
      {
        title: 'Lobby Painting Notice',
        content:
          'The main lobby will be repainted next weekend. Please use the side entrance while work is in progress.',
        pinned: false,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-04-04T12:00:00Z'),
        createdByUserId: adminUserId,
      },
    ],
  });

  const category = await prisma.expenseCategory.upsert({
    where: { name: 'Building Repairs' },
    update: {
      description: 'Operational and reserve repair expenses',
    },
    create: {
      name: 'Building Repairs',
      description: 'Operational and reserve repair expenses',
    },
  });

  await prisma.reserveTransaction.createMany({
    data: [
      {
        categoryId: category.categoryId,
        createdByUserId: adminUserId,
        type: 'EXPENSE',
        status: 'POSTED',
        title: 'Garage Door Repair',
        description: 'Emergency service call for garage motor replacement',
        amount: '1350.00',
        transactionDate: new Date('2026-04-01'),
        expectedDate: new Date('2026-04-01'),
      },
      {
        categoryId: category.categoryId,
        createdByUserId: adminUserId,
        type: 'PROJECTION',
        status: 'PLANNED',
        title: 'Roof Inspection',
        description: 'Annual preventive roof inspection and report',
        amount: '900.00',
        expectedDate: new Date('2026-05-15'),
      },
    ],
  });

  await prisma.maintenanceRequest.createMany({
    data: [
      {
        scope: 'UNIT',
        unitId: unit202.unitId,
        submittedByUserId: ownerTwo.userId,
        title: 'Kitchen sink leak',
        description: 'Leak under the sink cabinet after using the dishwasher.',
        status: 'OPEN',
        priority: 'MEDIUM',
        updatedAt: new Date(),
      },
      {
        scope: 'BUILDING',
        unitId: null,
        submittedByUserId: adminUserId,
        title: 'Hallway light outage',
        description: 'Third-floor hallway lights are flickering and partially out.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        updatedAt: new Date(),
      },
    ],
  });

  await prisma.meeting.create({
    data: {
      meetingDate: new Date('2026-04-20'),
      title: 'April Board Meeting',
      notes: 'Reviewed spring maintenance schedule and reserve plan updates.',
    },
  });

  console.log('Demo data seeded');
}

async function main() {
  const admin = await upsertAdmin();
  await seedDemoData(admin.userId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
