import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { QueryMaintenanceRequestDto } from './dto/query-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';

type AuthUser = {
  userId: string;
  role: 'ADMIN' | 'OWNER';
};

type UploadedMaintenanceFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const maintenanceAttachmentSelect = {
  fileId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  links: {
    where: { relatedType: 'MAINTENANCE_REQUEST' as const },
    select: {
      fileLinkId: true,
      relatedType: true,
      relatedId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
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

@Injectable()
export class MaintenanceRequestsService {
  constructor(private prisma: PrismaService) {}

  async findAll(authUser: AuthUser, query: QueryMaintenanceRequestDto) {
    const filters: Prisma.MaintenanceRequestWhereInput = {};

    if (query.scope) filters.scope = query.scope;
    if (query.status) filters.status = query.status;
    if (query.priority) filters.priority = query.priority;
    if (query.unitId) filters.unitId = query.unitId;

    let where: Prisma.MaintenanceRequestWhereInput = filters;

    if (authUser.role === 'ADMIN') {
      if (query.submittedByUserId) {
        where = {
          AND: [filters, { submittedByUserId: query.submittedByUserId }],
        };
      }
    } else {
      const ownedUnitIds = await this.getActiveOwnedUnitIds(authUser.userId);
      const visibility: Prisma.MaintenanceRequestWhereInput[] = [
        { scope: 'BUILDING' },
        { submittedByUserId: authUser.userId },
      ];

      if (ownedUnitIds.length > 0) {
        visibility.push({ unitId: { in: ownedUnitIds } });
      }

      where = {
        AND: [filters, { OR: visibility }],
      };
    }

    const requests = await this.prisma.maintenanceRequest.findMany({
      where,
      select: safeMaintenanceRequestSelect,
      orderBy: [{ createdAt: 'desc' }, { requestId: 'desc' }],
      skip: query.skip,
      take: query.take,
    });

    return this.attachFiles(requests);
  }

  async findOne(authUser: AuthUser, requestId: string) {
    const request = await this.findAccessibleRequest(authUser, requestId);
    const [hydrated] = await this.attachFiles([request]);
    return hydrated;
  }

  async findMy(authUser: AuthUser, query: QueryMaintenanceRequestDto) {
    const where: Prisma.MaintenanceRequestWhereInput = {
      submittedByUserId: authUser.userId,
    };

    if (query.scope) where.scope = query.scope;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.unitId) where.unitId = query.unitId;

    const requests = await this.prisma.maintenanceRequest.findMany({
      where,
      select: safeMaintenanceRequestSelect,
      orderBy: [{ createdAt: 'desc' }, { requestId: 'desc' }],
      skip: query.skip,
      take: query.take,
    });

    return this.attachFiles(requests);
  }

  async findByUnit(authUser: AuthUser, unitId: string) {
    if (authUser.role === 'OWNER') {
      await this.ensureOwnerHasActiveOwnership(authUser.userId, unitId);
    }

    const requests = await this.prisma.maintenanceRequest.findMany({
      where: { unitId },
      select: safeMaintenanceRequestSelect,
      orderBy: [{ createdAt: 'desc' }, { requestId: 'desc' }],
    });

    return this.attachFiles(requests);
  }

  async create(authUser: AuthUser, dto: CreateMaintenanceRequestDto) {
    const scope = dto.scope ?? 'UNIT';

    if (scope === 'UNIT') {
      if (!dto.unitId) {
        throw new BadRequestException('unitId is required for UNIT scope');
      }

      await this.ensureUnitExists(dto.unitId);

      if (authUser.role === 'OWNER') {
        await this.ensureOwnerHasActiveOwnership(authUser.userId, dto.unitId);
      }
    }

    if (scope === 'BUILDING' && dto.unitId) {
      throw new BadRequestException('unitId must be omitted for BUILDING scope');
    }

    try {
      const status = dto.status ?? 'OPEN';
      const closedAt = this.shouldClose(status) ? new Date() : null;

      const created = await this.prisma.maintenanceRequest.create({
        data: {
          scope,
          unitId: scope === 'UNIT' ? dto.unitId : null,
          submittedByUserId: authUser.userId,
          title: dto.title,
          description: dto.description,
          status,
          priority: dto.priority ?? 'MEDIUM',
          updatedAt: new Date(),
          closedAt,
        },
        select: safeMaintenanceRequestSelect,
      });

      const [hydrated] = await this.attachFiles([created]);
      return hydrated;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async uploadAttachment(
    authUser: AuthUser,
    requestId: string,
    file: UploadedMaintenanceFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    if (file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    await this.findRequestEditableByUser(authUser, requestId);
    const storedFile = await this.persistAttachment(file);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const createdFile = await tx.file.create({
          data: {
            originalName: file.originalname,
            storagePath: storedFile.storagePath,
            mimeType: file.mimetype,
            sizeBytes: BigInt(file.size),
            sha256Hash: storedFile.sha256Hash,
            uploadedByUserId: authUser.userId,
          },
          select: { fileId: true },
        });

        await tx.fileLink.create({
          data: {
            fileId: createdFile.fileId,
            relatedType: 'MAINTENANCE_REQUEST',
            relatedId: requestId,
            linkedByUserId: authUser.userId,
          },
        });

        return tx.file.findUnique({
          where: { fileId: createdFile.fileId },
          select: maintenanceAttachmentSelect,
        });
      });

      return this.serializeBigInt(created);
    } catch (error) {
      await this.deleteStoredFile(storedFile.storagePath);
      throw error;
    }
  }

  async update(authUser: AuthUser, requestId: string, dto: UpdateMaintenanceRequestDto) {
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { requestId },
      select: {
        requestId: true,
        submittedByUserId: true,
        status: true,
        scope: true,
        unitId: true,
        closedAt: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Maintenance request not found');
    }

    const isAdmin = authUser.role === 'ADMIN';
    const isOwnerRequest = existing.submittedByUserId === authUser.userId;

    if (!isAdmin && !isOwnerRequest) {
      throw new ForbiddenException('You can only update your own requests');
    }

    if (!isAdmin && existing.status !== 'OPEN') {
      throw new ForbiddenException('Owners can only edit OPEN requests');
    }

    if (!isAdmin && (dto.scope !== undefined || dto.unitId !== undefined)) {
      throw new ForbiddenException('Owners cannot change request scope or unit');
    }

    if (isAdmin) {
      const finalScope = dto.scope ?? existing.scope;
      const finalUnitId =
        dto.unitId === undefined ? existing.unitId : dto.unitId;

      if (finalScope === 'UNIT') {
        if (!finalUnitId) {
          throw new BadRequestException('unitId is required for UNIT scope');
        }
        await this.ensureUnitExists(finalUnitId);
      }

      if (finalScope === 'BUILDING' && finalUnitId) {
        throw new BadRequestException(
          'unitId must be omitted for BUILDING scope',
        );
      }
    }

    try {
      const nextStatus = dto.status ?? existing.status;
      const closedAt = this.resolveClosedAt(
        existing.status,
        nextStatus,
        existing.closedAt,
      );

      const data: Prisma.MaintenanceRequestUpdateInput = {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        updatedAt: new Date(),
        closedAt,
      };

      if (isAdmin && dto.scope !== undefined) {
        data.scope = dto.scope;
        if (dto.scope === 'BUILDING' && dto.unitId === undefined) {
          data.unit = { disconnect: true };
        }
      }

      if (isAdmin && dto.unitId !== undefined) {
        data.unit =
          dto.unitId === null
            ? { disconnect: true }
            : { connect: { unitId: dto.unitId } };
      }

      const updated = await this.prisma.maintenanceRequest.update({
        where: { requestId },
        data,
        select: safeMaintenanceRequestSelect,
      });

      const [hydrated] = await this.attachFiles([updated]);
      return hydrated;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(authUser: AuthUser, requestId: string) {
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { requestId },
      select: {
        requestId: true,
        submittedByUserId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (authUser.role !== 'ADMIN') {
      if (existing.submittedByUserId !== authUser.userId) {
        throw new ForbiddenException('You can only delete your own requests');
      }

      const ownerRequest = await this.prisma.maintenanceRequest.findUnique({
        where: { requestId },
        select: { status: true },
      });

      if (ownerRequest?.status !== 'OPEN') {
        throw new ForbiddenException('Owners can only delete OPEN requests');
      }
    }

    try {
      await this.prisma.maintenanceRequest.delete({ where: { requestId } });
      return { deleted: true };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private async ensureOwnerHasActiveOwnership(userId: string, unitId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ownership = await this.prisma.unitOwner.findFirst({
      where: {
        userId,
        unitId,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      select: { unitOwnerId: true },
    });

    if (!ownership) {
      throw new ForbiddenException('You do not have active ownership for this unit');
    }
  }

  private async hasActiveOwnership(userId: string, unitId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ownership = await this.prisma.unitOwner.findFirst({
      where: {
        userId,
        unitId,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      select: { unitOwnerId: true },
    });

    return Boolean(ownership);
  }

  private async getActiveOwnedUnitIds(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ownerships = await this.prisma.unitOwner.findMany({
      where: {
        userId,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      select: { unitId: true },
    });

    return ownerships.map((o) => o.unitId);
  }

  private async ensureUnitExists(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { unitId },
      select: { unitId: true },
    });

    if (!unit) {
      throw new BadRequestException('Invalid unitId');
    }
  }

  private shouldClose(status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED') {
    return status === 'COMPLETED' || status === 'CLOSED';
  }

  private async findAccessibleRequest(authUser: AuthUser, requestId: string) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { requestId },
      select: safeMaintenanceRequestSelect,
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (authUser.role !== 'ADMIN') {
      const canAccessBuilding = request.scope === 'BUILDING';
      const isOwnerRequest = request.submittedByUserId === authUser.userId;
      const ownsUnit =
        request.unitId !== null
          ? await this.hasActiveOwnership(authUser.userId, request.unitId)
          : false;

      if (!canAccessBuilding && !isOwnerRequest && !ownsUnit) {
        throw new ForbiddenException('You do not have access to this request');
      }
    }

    return request;
  }

  private async findRequestEditableByUser(authUser: AuthUser, requestId: string) {
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { requestId },
      select: {
        requestId: true,
        submittedByUserId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (
      authUser.role !== 'ADMIN' &&
      existing.submittedByUserId !== authUser.userId
    ) {
      throw new ForbiddenException('You can only upload files to your own requests');
    }

    if (authUser.role !== 'ADMIN' && existing.status !== 'OPEN') {
      throw new ForbiddenException('Owners can only change OPEN requests');
    }

    return existing;
  }

  private async attachFiles<T extends { requestId: string }>(requests: T[]) {
    if (requests.length === 0) {
      return requests.map((request) =>
        this.serializeBigInt({
          ...request,
          attachments: [],
        }),
      );
    }

    const requestIds = requests.map((request) => request.requestId);
    const files = await this.prisma.file.findMany({
      where: {
        links: {
          some: {
            relatedType: 'MAINTENANCE_REQUEST',
            relatedId: { in: requestIds },
          },
        },
      },
      select: maintenanceAttachmentSelect,
      orderBy: { uploadedAt: 'desc' },
    });

    const filesByRequestId = new Map<string, Array<(typeof files)[number]>>();

    for (const file of files) {
      for (const link of file.links) {
        if (!requestIds.includes(link.relatedId)) {
          continue;
        }

        const bucket = filesByRequestId.get(link.relatedId) ?? [];
        bucket.push(file);
        filesByRequestId.set(link.relatedId, bucket);
      }
    }

    return requests.map((request) =>
      this.serializeBigInt({
        ...request,
        attachments: filesByRequestId.get(request.requestId) ?? [],
      }),
    );
  }

  private resolveClosedAt(
    previousStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED',
    nextStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED',
    existingClosedAt: Date | null,
  ): Date | null | undefined {
    const wasClosed = this.shouldClose(previousStatus);
    const willBeClosed = this.shouldClose(nextStatus);

    if (!wasClosed && willBeClosed) {
      return new Date();
    }

    if (wasClosed && !willBeClosed) {
      return null;
    }

    if (wasClosed && willBeClosed && !existingClosedAt) {
      return new Date();
    }

    return undefined;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Maintenance request not found');
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid relation data');
      }

      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate maintenance request data');
      }
    }

    throw error;
  }

  private async persistAttachment(file: UploadedMaintenanceFile) {
    const uploadDir = join(process.cwd(), 'storage', 'maintenance-attachments');
    await fs.mkdir(uploadDir, { recursive: true });

    const extension = extname(file.originalname) || this.fallbackExtension(file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const storagePath = join(uploadDir, filename);
    const sha256Hash = createHash('sha256').update(file.buffer).digest('hex');

    await fs.writeFile(storagePath, file.buffer);

    return {
      storagePath,
      sha256Hash,
    };
  }

  private fallbackExtension(mimeType: string) {
    if (mimeType === 'application/pdf') return '.pdf';
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    return '.jpg';
  }

  private async deleteStoredFile(storagePath: string) {
    try {
      await fs.unlink(storagePath);
    } catch {
      // Ignore
    }
  }

  private serializeBigInt<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_, currentValue: unknown) =>
        typeof currentValue === 'bigint' ? Number(currentValue) : currentValue,
      ),
    ) as T;
  }
}
