import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsQaService } from '../documents/documents.qa.service';

const safeUserSelect = {
  userId: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
};

const safeAnnouncementSelect = {
  announcementId: true,
  title: true,
  content: true,
  pinned: true,
  status: true,
  publishedAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
    },
  },
};

const safeMaintenanceRequestSelect = {
  requestId: true,
  scope: true,
  unitId: true,
  submittedByUserId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  submittedBy: {
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
    },
  },
  unit: {
    select: {
      unitId: true,
      unitNumber: true,
      status: true,
    },
  },
};

const safeUnitDueSelect = {
  dueId: true,
  unitId: true,
  periodMonth: true,
  dueDate: true,
  paidDate: true,
  amount: true,
  status: true,
  note: true,
  emailNotifiedAt: true,
  createdAt: true,
  updatedAt: true,
  unit: {
    select: {
      unitId: true,
      unitNumber: true,
      status: true,
    },
  },
};

const safeOwnerDocumentSelect = {
  documentId: true,
  title: true,
  docType: true,
  visibility: true,
  isMandatory: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  versions: {
    select: {
      versionId: true,
      versionNumber: true,
      isCurrent: true,
      indexStatus: true,
      indexedAt: true,
      indexError: true,
      uploadedAt: true,
      file: {
        select: {
          fileId: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    },
    orderBy: { versionNumber: 'desc' as const },
  },
};

@Injectable()
export class OwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsQaService: DocumentsQaService,
  ) {}

  async getDashboard(userId: string, selectedUnitId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const today = this.startOfToday();

    const activeOwnerships = await this.prisma.unitOwner.findMany({
      where: {
        userId,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      orderBy: [{ startDate: 'desc' }, { unitOwnerId: 'desc' }],
      select: {
        unitOwnerId: true,
        startDate: true,
        endDate: true,
        unit: {
          select: {
            unitId: true,
            unitNumber: true,
            unitType: true,
            floor: true,
            bedrooms: true,
            bathrooms: true,
            squareFeet: true,
            parkingSpots: true,
            monthlyFee: true,
            status: true,
            notes: true,
          },
        },
      },
    });

    const activeOwnership =
      (selectedUnitId
        ? activeOwnerships.find((ownership) => ownership.unit.unitId === selectedUnitId)
        : null) ?? activeOwnerships[0] ?? null;

    const dues = activeOwnership
      ? await this.prisma.unitDue.findMany({
          where: { unitId: activeOwnership.unit.unitId },
          select: safeUnitDueSelect,
          orderBy: [{ dueDate: 'asc' }, { periodMonth: 'desc' }],
        })
      : [];

    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() },
      },
      select: safeAnnouncementSelect,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 3,
    });

    const maintenance = await this.prisma.maintenanceRequest.findMany({
      where: { submittedByUserId: userId },
      select: safeMaintenanceRequestSelect,
      orderBy: [{ createdAt: 'desc' }, { requestId: 'desc' }],
      take: 3,
    });

    const reserveTransactions = await this.prisma.reserveTransaction.findMany({
      where: {
        status: 'POSTED',
        type: {
          in: ['EXPENSE', 'ADJUSTMENT'],
        },
      },
      select: {
        type: true,
        amount: true,
      },
    });

    const reserveFundTotal = reserveTransactions.reduce((sum, transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'EXPENSE') {
        return sum - Math.abs(amount);
      }

      return sum + amount;
    }, 0);

    const availableDocumentCount = await this.prisma.document.count({
      where: {
        visibility: {
          in: ['PUBLIC', 'OWNERS_ONLY'],
        },
      },
    });

    return {
      profile: user,
      activeOwnerships,
      activeOwnership,
      dues,
      duesSummary: this.buildDuesSummary(activeOwnership, dues),
      reserveFundTotal,
      documentsSummary: {
        availableCount: availableDocumentCount,
      },
      announcements,
      maintenance,
    };
  }

  async getDocuments() {
    const documents = await this.prisma.document.findMany({
      where: {
        visibility: {
          in: ['PUBLIC', 'OWNERS_ONLY'],
        },
      },
      select: safeOwnerDocumentSelect,
      orderBy: [{ isMandatory: 'desc' }, { createdAt: 'desc' }],
    });

    return this.serializeBigInt(documents);
  }

  async askDocuments(query: string) {
    return this.documentsQaService.askOwnerAccessible(query);
  }

  private buildDuesSummary(
    activeOwnership: {
      unit: {
        monthlyFee: unknown;
      };
    } | null,
    dues: Array<{
      amount: unknown;
      dueDate: Date;
      status: 'UNPAID' | 'PAID' | 'WAIVED';
    }>,
  ) {
    const unpaidDues = dues.filter((due) => due.status === 'UNPAID');
    const currentBalance = unpaidDues.reduce(
      (sum, due) => sum + Number(due.amount),
      0,
    );

    const latestDueDate =
      dues.length > 0
        ? dues.reduce(
            (latest, due) => (due.dueDate > latest ? due.dueDate : latest),
            dues[0].dueDate,
          )
        : null;

    return {
      currentBalance,
      currentStatus: currentBalance > 0 ? 'UNPAID' : 'PAID',
      monthlyFee: activeOwnership
        ? Number(activeOwnership.unit.monthlyFee)
        : null,
      nextDueDate: latestDueDate
        ? this.addMonth(latestDueDate)
        : null,
      unpaidCount: unpaidDues.length,
    };
  }

  private addMonth(value: Date) {
    const next = new Date(value);
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private serializeBigInt<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_, currentValue: unknown) =>
        typeof currentValue === 'bigint' ? Number(currentValue) : currentValue,
      ),
    ) as T;
  }
}
