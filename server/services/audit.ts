import { db } from '../db';
import { auditLogs, users, runnerProfiles, trainingPlans, workoutTemplates, workouts, performanceMetrics, workoutNotes } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';

export interface AuditLogEntry {
  userId: number;
  action: 'create' | 'update' | 'delete' | 'archive' | 'restore';
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

type EntityTable = PgTableWithColumns<any>;

export class AuditService {
  private static instance: AuditService;
  private entityTables: Map<string, EntityTable>;

  private constructor() {
    const tableEntries: [string, EntityTable][] = [
      ['user', users],
      ['runnerProfile', runnerProfiles],
      ['trainingPlan', trainingPlans],
      ['workoutTemplate', workoutTemplates],
      ['workout', workouts],
      ['performanceMetric', performanceMetrics],
      ['workoutNote', workoutNotes]
    ];
    this.entityTables = new Map(tableEntries);
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logAuditEntry(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent
      });
    } catch (error) {
      logger.error('Failed to log audit entry:', error);
      throw error;
    }
  }

  async getAuditLogs(
    filters: {
      userId?: number;
      entityType?: string;
      entityId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ) {
    try {
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.entityType) {
        conditions.push(eq(auditLogs.entityType, filters.entityType));
      }
      if (filters.entityId) {
        conditions.push(eq(auditLogs.entityId, filters.entityId));
      }
      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters.startDate) {
        conditions.push(gte(auditLogs.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(auditLogs.createdAt, filters.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  async archiveOldData(
    entityType: string,
    olderThan: Date,
    batchSize: number = 1000
  ): Promise<number> {
    try {
      const table = this.getTableForEntityType(entityType);
      if (!table) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      let archivedCount = 0;
      let hasMore = true;

      while (hasMore) {
        const records = await db
          .select()
          .from(table)
          .where(lte(table.createdAt, olderThan))
          .limit(batchSize);

        if (records.length === 0) {
          hasMore = false;
          continue;
        }

        for (const record of records) {
          await db
            .update(table)
            .set({
              isArchived: true,
              archivedAt: new Date(),
              version: record.version + 1
            })
            .where(eq(table.id, record.id));

          await this.logAuditEntry({
            userId: record.updatedBy || 0,
            action: 'archive',
            entityType,
            entityId: record.id.toString(),
            changes: { isArchived: true, archivedAt: new Date() }
          });

          archivedCount++;
        }

        if (records.length < batchSize) {
          hasMore = false;
        }
      }

      return archivedCount;
    } catch (error) {
      logger.error('Failed to archive old data:', error);
      throw error;
    }
  }

  async restoreArchivedData(
    entityType: string,
    ids: string[],
    userId: number
  ): Promise<number> {
    try {
      const table = this.getTableForEntityType(entityType);
      if (!table) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      let restoredCount = 0;

      for (const id of ids) {
        const record = await db
          .select()
          .from(table)
          .where(eq(table.id, id))
          .limit(1);

        if (record.length === 0) continue;

        await db
          .update(table)
          .set({
            isArchived: false,
            archivedAt: null,
            version: record[0].version + 1
          })
          .where(eq(table.id, id));

        await this.logAuditEntry({
          userId,
          action: 'restore',
          entityType,
          entityId: id,
          changes: { isArchived: false, archivedAt: null }
        });

        restoredCount++;
      }

      return restoredCount;
    } catch (error) {
      logger.error('Failed to restore archived data:', error);
      throw error;
    }
  }

  private getTableForEntityType(entityType: string): EntityTable | null {
    return this.entityTables.get(entityType) || null;
  }
} 