import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_EMAIL_DOMAIN = 'seed.condo.app';
const LEGACY_DEMO_EMAILS = [
  'owner.one@example.com',
  'owner.two@example.com',
  'owner.three@example.com',
];

const FIRST_NAMES = [
  'Olivia', 'Noah', 'Emma', 'Liam', 'Sophia', 'Mason', 'Ava', 'Lucas',
  'Mia', 'Ethan', 'Charlotte', 'Benjamin', 'Amelia', 'Elijah', 'Harper',
  'James', 'Ella', 'Henry', 'Abigail', 'Alexander', 'Scarlett', 'Daniel',
  'Grace', 'Michael', 'Chloe', 'Jack', 'Layla', 'Sebastian', 'Aria', 'Owen',
  'Zoe', 'Levi', 'Lily', 'Julian', 'Nora', 'Carter', 'Hannah', 'Isaac',
  'Sofia', 'Wyatt', 'Avery', 'Caleb', 'Victoria', 'Nathan', 'Penelope',
];

const LAST_NAMES = [
  'Morrison', 'Patel', 'Nguyen', 'Smith', 'Brown', 'Wilson', 'Taylor',
  'Johnson', 'Martin', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King',
  'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell',
  'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans',
  'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed',
  'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Cox',
  'Howard',
];

const UNIT_TYPES = ['Studio', '1 Bedroom', '2 Bedroom', '2 Bedroom + Den', '3 Bedroom'];

function monthDate(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1));
}

function dateAt(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function phoneFor(index: number) {
  return `416-555-${String(1000 + index).padStart(4, '0')}`;
}

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

  console.log('Admin ready');
  return admin;
}

async function clearExistingSeedData(defaultAdminEmail: string) {
  await prisma.meetingMinutes.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.reserveTransaction.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.unitDue.deleteMany();
  await prisma.duesImportLine.deleteMany();
  await prisma.duesImportBatch.deleteMany();
  await prisma.unitOwner.deleteMany();
  await prisma.unit.deleteMany();

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } },
        { email: { in: LEGACY_DEMO_EMAILS } },
      ],
      NOT: {
        email: defaultAdminEmail,
      },
    },
  });
}

async function seedUsers(adminUserId: string, passwordHash: string) {
  const extraAdmins = Array.from({ length: 4 }, (_, index) => ({
    email: `admin${index + 1}@${SEED_EMAIL_DOMAIN}`,
    passwordHash,
    firstName: FIRST_NAMES[index],
    lastName: `Admin${index + 1}`,
    phone: phoneFor(index),
    role: 'ADMIN' as const,
    active: true,
  }));

  const owners = Array.from({ length: 36 }, (_, index) => ({
    email: `owner${String(index + 1).padStart(3, '0')}@${SEED_EMAIL_DOMAIN}`,
    passwordHash,
    firstName: FIRST_NAMES[(index + 4) % FIRST_NAMES.length],
    lastName: LAST_NAMES[index % LAST_NAMES.length],
    phone: phoneFor(index + 10),
    role: 'OWNER' as const,
    active: index % 11 !== 0,
  }));

  await prisma.user.createMany({
    data: [...extraAdmins, ...owners],
  });

  const createdOwners = await prisma.user.findMany({
    where: {
      role: 'OWNER',
      email: { endsWith: `@${SEED_EMAIL_DOMAIN}` },
    },
    orderBy: { email: 'asc' },
  });

  const createdAdmins = await prisma.user.findMany({
    where: {
      OR: [
        { userId: adminUserId },
        { role: 'ADMIN', email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } },
      ],
    },
    orderBy: { email: 'asc' },
  });

  return { owners: createdOwners, admins: createdAdmins };
}

async function seedUnits() {
  const unitRows = Array.from({ length: 50 }, (_, index) => {
    const floor = Math.floor(index / 10) + 1;
    const offset = (index % 10) + 1;
    const bedrooms = index % 5 === 0 ? 0 : ((index % 4) + 1);
    const bathrooms = bedrooms >= 3 ? '2.00' : bedrooms === 0 ? '1.00' : '1.50';
    const squareFeet = 540 + floor * 35 + bedrooms * 120 + offset * 8;
    const monthlyFee = 360 + floor * 20 + bedrooms * 55 + offset * 3;

    return {
      unitNumber: `${floor}${String(offset).padStart(2, '0')}`,
      unitType: UNIT_TYPES[index % UNIT_TYPES.length],
      floor,
      bedrooms,
      bathrooms,
      squareFeet,
      parkingSpots: bedrooms >= 2 ? 1 : 0,
      monthlyFee: monthlyFee.toFixed(2),
      status: index % 17 === 0 ? ('INACTIVE' as const) : ('ACTIVE' as const),
      notes: `Seeded demo unit ${index + 1}`,
    };
  });

  await prisma.unit.createMany({ data: unitRows });

  return prisma.unit.findMany({
    orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
  });
}

async function seedOwnerships(units: Awaited<ReturnType<typeof seedUnits>>, owners: Array<{ userId: string }>) {
  const ownershipRows: Array<{
    unitId: string;
    userId: string;
    startDate: Date;
    endDate?: Date;
  }> = [];

  units.forEach((unit, index) => {
    const primaryOwner = owners[index % owners.length];
    ownershipRows.push({
      unitId: unit.unitId,
      userId: primaryOwner.userId,
      startDate: dateAt(2025, (index % 12) + 1, ((index % 20) + 1)),
    });

    if (index % 8 === 0) {
      const sharedOwner = owners[(index + 7) % owners.length];
      ownershipRows.push({
        unitId: unit.unitId,
        userId: sharedOwner.userId,
        startDate: dateAt(2025, ((index + 2) % 12) + 1, ((index % 20) + 1)),
      });
    }
  });

  await prisma.unitOwner.createMany({ data: ownershipRows });
  return ownershipRows;
}

async function seedDues(units: Awaited<ReturnType<typeof seedUnits>>, adminUserId: string) {
  const months = [
    monthDate(2026, 2),
    monthDate(2026, 3),
    monthDate(2026, 4),
    monthDate(2026, 5),
  ];

  const dueRows = units.flatMap((unit, unitIndex) =>
    months.map((periodMonth, monthIndex) => {
      const monthNumber = monthIndex + 2;
      const cycle = (unitIndex + monthIndex) % 5;
      const status =
        cycle === 0 ? 'UNPAID' : cycle === 1 ? 'WAIVED' : 'PAID';
      const paidDate = status === 'PAID' ? dateAt(2026, monthNumber, 2 + (unitIndex % 3)) : null;
      const note =
        status === 'UNPAID'
          ? 'Awaiting owner payment'
          : status === 'WAIVED'
            ? 'Manager-approved courtesy adjustment'
            : 'Paid through online banking';

      return {
        unitId: unit.unitId,
        periodMonth,
        amount: Number(unit.monthlyFee).toFixed(2),
        status,
        updatedByUserId: adminUserId,
        updatedAt: new Date(),
        note,
        dueDate: dateAt(2026, monthNumber, 5),
        paidDate,
      };
    }),
  );

  await prisma.unitDue.createMany({ data: dueRows });
}

async function seedAnnouncements(adminUserId: string) {
  const announcementRows = [
    ['Spring HVAC Tune-Up', 'HVAC contractors will inspect rooftop units on April 18.'],
    ['Garage Cleaning', 'Visitor parking will be restricted during the garage washdown.'],
    ['Pool Opening', 'The pool deck and seating area will reopen for the season on May 10.'],
    ['Window Washing', 'Exterior window cleaning is scheduled building-wide next Tuesday.'],
    ['Intercom Upgrade', 'Suite buzzer testing will occur in phases over the next two weeks.'],
    ['Landscaping Refresh', 'Front entrance planters and courtyard beds are being replanted.'],
    ['Fire Drill Notice', 'A daytime fire drill will be conducted with on-site staff present.'],
    ['Bike Room Audit', 'Unclaimed bicycles will be tagged before seasonal storage clean-up.'],
    ['Board Election Reminder', 'Submit candidate bios before the nomination deadline this Friday.'],
    ['Water Shutoff', 'Units stack 03 and 04 will be affected for valve replacement.'],
    ['Archived Painting Update', 'This notice remains for historical reference only.'],
    ['Draft Security Memo', 'Draft message prepared for front-desk access changes.'],
  ];

  await prisma.announcement.createMany({
    data: announcementRows.map(([title, content], index) => ({
      title,
      content,
      pinned: index < 3,
      status:
        index < 10
          ? ('PUBLISHED' as const)
          : index === 10
            ? ('ARCHIVED' as const)
            : ('DRAFT' as const),
      publishedAt: index < 10 ? new Date(Date.UTC(2026, 3, 1 + index, 13, 0, 0)) : null,
      createdByUserId: adminUserId,
    })),
  });
}

async function seedCategories() {
  const rows = [
    ['Building Repairs', 'Operational and reserve repair expenses'],
    ['Mechanical Systems', 'HVAC, plumbing, and electrical work'],
    ['Exterior Envelope', 'Roof, windows, masonry, and facade work'],
    ['Common Area Refresh', 'Lobby, hallway, and amenity improvements'],
    ['Life Safety', 'Fire panel, alarms, and compliance costs'],
    ['Grounds', 'Landscaping, snow, and exterior upkeep'],
  ];

  await prisma.expenseCategory.createMany({
    data: rows.map(([name, description]) => ({ name, description })),
  });

  return prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
}

async function seedTransactions(
  adminUserId: string,
  categories: Array<{ categoryId: string; name: string }>,
) {
  const projectionTitles = [
    'Roof membrane replacement',
    'Elevator modernization study',
    'Balcony railing repaint',
    'Hallway flooring refresh',
    'Domestic hot water pump',
    'Garage line painting',
    'Security camera expansion',
    'Trash room ventilation upgrade',
    'Courtyard irrigation refresh',
    'Fire panel battery replacement',
    'Lobby furniture update',
    'Window caulking program',
    'Generator load bank test',
    'Boiler controls retrofit',
    'Mailroom cabinet replacement',
    'Pool filtration overhaul',
  ];

  const expenseTitles = [
    'Garage door motor repair',
    'Plumbing stack leak repair',
    'Hallway drywall patching',
    'Lobby painter final invoice',
    'Electrical panel troubleshooting',
    'Snow removal contract payment',
    'Landscaping spring cleanup',
    'Boiler emergency service call',
    'Intercom handset replacements',
    'Roof patch follow-up repair',
    'Amenity room chair replacement',
    'Exterior lighting service',
    'Sump pump replacement',
    'Concrete crack sealing',
    'Front entry door closer repair',
    'Drain cleaning service',
    'Pool heater ignition repair',
    'Pest control quarterly visit',
    'Fire extinguisher annual service',
    'Garage exhaust fan repair',
  ];

  const projectionRows = projectionTitles.map((title, index) => ({
    categoryId: categories[index % categories.length].categoryId,
    createdByUserId: adminUserId,
    type: 'PROJECTION' as const,
    status: index % 6 === 0 ? ('CANCELLED' as const) : ('PLANNED' as const),
    title,
    description: `Seeded reserve projection for ${categories[index % categories.length].name.toLowerCase()}.`,
    amount: (850 + index * 175).toFixed(2),
    expectedDate: dateAt(2026, ((index + 4) % 8) + 5, 10 + (index % 12)),
  }));

  const expenseRows = expenseTitles.map((title, index) => ({
    categoryId: categories[(index + 2) % categories.length].categoryId,
    createdByUserId: adminUserId,
    type: 'EXPENSE' as const,
    status: index % 7 === 0 ? ('CANCELLED' as const) : ('POSTED' as const),
    title,
    description: `Completed seeded expense tied to ${categories[(index + 2) % categories.length].name.toLowerCase()}.`,
    amount: (420 + index * 96).toFixed(2),
    transactionDate: dateAt(2026, ((index + 1) % 4) + 1, 3 + (index % 20)),
    expectedDate: dateAt(2026, ((index + 1) % 4) + 1, 3 + (index % 20)),
  }));

  await prisma.reserveTransaction.createMany({
    data: [...projectionRows, ...expenseRows],
  });
}

async function seedMaintenance(
  units: Awaited<ReturnType<typeof seedUnits>>,
  ownershipRows: Array<{ unitId: string; userId: string }>,
  adminUserId: string,
) {
  const unitOwnerMap = new Map<string, string>();
  for (const row of ownershipRows) {
    if (!unitOwnerMap.has(row.unitId)) {
      unitOwnerMap.set(row.unitId, row.userId);
    }
  }

  const unitRows = units.slice(0, 28).map((unit, index) => {
    const statusCycle = index % 4;
    const status =
      statusCycle === 0
        ? 'OPEN'
        : statusCycle === 1
          ? 'IN_PROGRESS'
          : statusCycle === 2
            ? 'COMPLETED'
            : 'CLOSED';

    return {
      scope: 'UNIT' as const,
      unitId: unit.unitId,
      submittedByUserId: unitOwnerMap.get(unit.unitId) ?? adminUserId,
      title: `Unit ${unit.unitNumber} issue ${index + 1}`,
      description: `Seeded owner request for unit ${unit.unitNumber}.`,
      status,
      priority:
        index % 3 === 0 ? ('HIGH' as const) : index % 3 === 1 ? ('MEDIUM' as const) : ('LOW' as const),
      createdAt: new Date(Date.UTC(2026, 2 + (index % 3), 1 + index)),
      updatedAt: new Date(Date.UTC(2026, 2 + (index % 3), 2 + index)),
      closedAt: status === 'COMPLETED' || status === 'CLOSED'
        ? new Date(Date.UTC(2026, 2 + (index % 3), 5 + index))
        : null,
    };
  });

  const buildingTitles = [
    'Lobby air freshener replacement',
    'Garage ramp salt cleanup',
    'Courtyard lighting review',
    'Amenity room thermostat issue',
    'Recycling room odor complaint',
    'Mailbox door alignment',
    'Hallway paint touch-up',
    'Gym equipment service',
    'Visitor parking sign replacement',
    'Party room AV check',
    'Roof hatch inspection',
    'Exterior door sweep replacement',
  ];

  const buildingRows = buildingTitles.map((title, index) => ({
    scope: 'BUILDING' as const,
    unitId: null,
    submittedByUserId: index % 2 === 0 ? adminUserId : unitRows[index % unitRows.length].submittedByUserId,
    title,
    description: `Seeded building-wide maintenance item: ${title.toLowerCase()}.`,
    status:
      index % 3 === 0
        ? ('OPEN' as const)
        : index % 3 === 1
          ? ('IN_PROGRESS' as const)
          : ('COMPLETED' as const),
    priority: index % 4 === 0 ? ('HIGH' as const) : ('MEDIUM' as const),
    createdAt: new Date(Date.UTC(2026, 1 + (index % 4), 4 + index)),
    updatedAt: new Date(Date.UTC(2026, 1 + (index % 4), 6 + index)),
    closedAt: index % 3 === 2 ? new Date(Date.UTC(2026, 1 + (index % 4), 9 + index)) : null,
  }));

  await prisma.maintenanceRequest.createMany({
    data: [...unitRows, ...buildingRows],
  });
}

async function seedMeetings() {
  const rows = Array.from({ length: 8 }, (_, index) => ({
    meetingDate: dateAt(2026, index + 1, 20),
    title: `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'][index]} Board Meeting`,
    notes: `Seeded board meeting notes package ${index + 1}.`,
  }));

  await prisma.meeting.createMany({ data: rows });
}

async function seedDemoData(defaultAdminEmail: string, adminUserId: string) {
  const password = process.env.PASSWORD?.trim();

  if (!password) {
    throw new Error('PASSWORD must be set before running the seed');
  }

  await clearExistingSeedData(defaultAdminEmail);

  const passwordHash = await bcrypt.hash(password, 10);
  const { owners } = await seedUsers(adminUserId, passwordHash);
  const units = await seedUnits();
  const ownershipRows = await seedOwnerships(units, owners);

  await seedDues(units, adminUserId);
  await seedAnnouncements(adminUserId);

  const categories = await seedCategories();
  await seedTransactions(adminUserId, categories);
  await seedMaintenance(units, ownershipRows, adminUserId);
  await seedMeetings();

  console.log(`Seeded ${units.length} units, ${owners.length} owners, and rich demo activity`);
}

async function main() {
  const admin = await upsertAdmin();
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim();

  if (!defaultAdminEmail) {
    throw new Error('DEFAULT_ADMIN_EMAIL must be set before running the seed');
  }

  await seedDemoData(defaultAdminEmail, admin.userId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
