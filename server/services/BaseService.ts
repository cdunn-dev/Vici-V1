import { db } from '../db';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { AuditService } from './audit';
import { logger } from '../utils/logger';

export interface BaseEntity {
  id: number | string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  version: number;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedBy: number | null;
}

type EntityData<T> = Omit<T, keyof BaseEntity>;
type BaseData = Pick<BaseEntity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isArchived'>;
type UpdateData = Omit<Pick<BaseEntity, 'updatedAt' | 'updatedBy'>, 'version'> & {
  version: ReturnType<typeof sql.raw>;
};

type BaseUpdateData = {
  updatedAt: Date;
  updatedBy: number;
  version: ReturnType<typeof sql.raw>;
};

type SoftDeleteData = BaseUpdateData & {
  deletedAt: Date;
  deletedBy: number;
};

type RestoreData = BaseUpdateData & {
  deletedAt: null;
  deletedBy: null;
};

type ArchiveData = BaseUpdateData & {
  isArchived: true;
  archivedAt: Date;
  archivedBy: number;
};

type UnarchiveData = BaseUpdateData & {
  isArchived: false;
  archivedAt: null;
  archivedBy: null;
};

type CreateData<T> = EntityData<T> & BaseData;

function isBaseEntity(obj: any): obj is BaseEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    'version' in obj &&
    'isArchived' in obj
  );
}

export class BaseService<T extends BaseEntity> {
  protected table: PgTableWithColumns<any>;
  protected entityType: string;
  protected auditService: AuditService;

  constructor(table: PgTableWithColumns<any>, entityType: string) {
    this.table = table;
    this.entityType = entityType;
    this.auditService = AuditService.getInstance();
  }

  async create(data: EntityData<T>, userId: number): Promise<T> {
    try {
      const now = new Date();
      const baseData: BaseData = {
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
        isArchived: false
      };

      const insertData = {
        ...data,
        ...baseData
      };

      const result = await db.insert(this.table).values(insertData as unknown as T).returning();

      await this.auditService.logAuditEntry({
        userId,
        action: 'create',
        entityType: this.entityType,
        entityId: result[0].id.toString(),
        changes: data
      });

      return result[0] as T;
    } catch (error) {
      logger.error(`Failed to create ${this.entityType}:`, error);
      throw error;
    }
  }

  async update(id: number | string, data: Partial<EntityData<T>>, userId: number): Promise<T> {
    try {
      const now = new Date();
      const baseData: UpdateData = {
        updatedAt: now,
        updatedBy: userId,
        version: sql.raw('version + 1')
      };

      const updateData = {
        ...data,
        ...baseData
      };

      const result = await db
        .update(this.table)
        .set(updateData as unknown as Partial<T>)
        .where(eq(this.table.id as any, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`${this.entityType} not found`);
      }

      await this.auditService.logAuditEntry({
        userId,
        action: 'update',
        entityType: this.entityType,
        entityId: id.toString(),
        changes: data
      });

      return result[0] as T;
    } catch (error) {
      logger.error(`Failed to update ${this.entityType}:`, error);
      throw error;
    }
  }

  async softDelete(id: number | string, userId: number): Promise<void> {
    try {
      const now = new Date();
      const updateData: SoftDeleteData = {
        deletedAt: now,
        deletedBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: sql.raw('version + 1')
      };

      const result = await db
        .update(this.table)
        .set(updateData as unknown as Partial<T>)
        .where(eq(this.table.id as any, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`${this.entityType} not found`);
      }

      await this.auditService.logAuditEntry({
        userId,
        action: 'delete',
        entityType: this.entityType,
        entityId: id.toString(),
        changes: { deletedAt: now }
      });
    } catch (error) {
      logger.error(`Failed to soft delete ${this.entityType}:`, error);
      throw error;
    }
  }

  async restore(id: number | string, userId: number): Promise<T> {
    try {
      const now = new Date();
      const updateData: RestoreData = {
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
        updatedBy: userId,
        version: sql.raw('version + 1')
      };

      const result = await db
        .update(this.table)
        .set(updateData as unknown as Partial<T>)
        .where(eq(this.table.id as any, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`${this.entityType} not found`);
      }

      await this.auditService.logAuditEntry({
        userId,
        action: 'restore',
        entityType: this.entityType,
        entityId: id.toString(),
        changes: { deletedAt: null }
      });

      return result[0] as T;
    } catch (error) {
      logger.error(`Failed to restore ${this.entityType}:`, error);
      throw error;
    }
  }

  async archive(id: number | string, userId: number): Promise<T> {
    try {
      const now = new Date();
      const updateData: ArchiveData = {
        isArchived: true,
        archivedAt: now,
        archivedBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: sql.raw('version + 1')
      };

      const result = await db
        .update(this.table)
        .set(updateData as unknown as Partial<T>)
        .where(eq(this.table.id as any, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`${this.entityType} not found`);
      }

      await this.auditService.logAuditEntry({
        userId,
        action: 'archive',
        entityType: this.entityType,
        entityId: id.toString(),
        changes: { isArchived: true, archivedAt: now }
      });

      return result[0] as T;
    } catch (error) {
      logger.error(`Failed to archive ${this.entityType}:`, error);
      throw error;
    }
  }

  async unarchive(id: number | string, userId: number): Promise<T> {
    try {
      const now = new Date();
      const updateData: UnarchiveData = {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: now,
        updatedBy: userId,
        version: sql.raw('version + 1')
      };

      const result = await db
        .update(this.table)
        .set(updateData as unknown as Partial<T>)
        .where(eq(this.table.id as any, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`${this.entityType} not found`);
      }

      await this.auditService.logAuditEntry({
        userId,
        action: 'restore',
        entityType: this.entityType,
        entityId: id.toString(),
        changes: { isArchived: false, archivedAt: null }
      });

      return result[0] as T;
    } catch (error) {
      logger.error(`Failed to unarchive ${this.entityType}:`, error);
      throw error;
    }
  }

  async findById(id: number | string, includeDeleted: boolean = false): Promise<T | null> {
    try {
      const conditions = [eq(this.table.id as any, id)];
      if (!includeDeleted) {
        conditions.push(isNull(this.table.deletedAt as any));
      }

      const result = await db
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(1);

      return (result[0] || null) as T | null;
    } catch (error) {
      logger.error(`Failed to find ${this.entityType}:`, error);
      throw error;
    }
  }

  async findAll(
    filters: {
      includeDeleted?: boolean;
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    try {
      const conditions = [];

      if (!filters.includeDeleted) {
        conditions.push(isNull(this.table.deletedAt as any));
      }
      if (!filters.includeArchived) {
        conditions.push(eq(this.table.isArchived as any, false));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(this.table)
        .where(whereClause)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);

      return result as T[];
    } catch (error) {
      logger.error(`Failed to find all ${this.entityType}s:`, error);
      throw error;
    }
  }
} 