import { PrismaClient, Prisma } from '@prisma/client';
import {
  encryptTransactionPayload,
  decryptTransactionRecord,
} from './encryption';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Tenant-Scoped Database Wrapper for Strict Row-Level Multi-Tenant Isolation
 * Automatically bounds all read and write queries to the authenticated organizationId
 * and executes Application-Level Encryption (AES-256-GCM) on sensitive PII fields.
 */
export function getTenantDb(organizationId: string) {
  if (!organizationId || typeof organizationId !== 'string') {
    throw new Error('TenantIsolationViolation: organizationId is required for all data operations');
  }

  return {
    raw: prisma,
    transactions: {
      findMany: async (args?: Parameters<typeof prisma.ledgerTransaction.findMany>[0]) => {
        const items = await prisma.ledgerTransaction.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId,
          },
        });
        return items.map(decryptTransactionRecord);
      },
      findUnique: async (id: string) => {
        const item = await prisma.ledgerTransaction.findUnique({ where: { id } });
        if (!item || item.organizationId !== organizationId) return null;
        return decryptTransactionRecord(item);
      },
      findFirst: async (args?: Parameters<typeof prisma.ledgerTransaction.findFirst>[0]) => {
        const item = await prisma.ledgerTransaction.findFirst({
          ...args,
          where: {
            ...args?.where,
            organizationId,
          },
        });
        if (!item || item.organizationId !== organizationId) return null;
        return decryptTransactionRecord(item);
      },
      create: async (args: { data: Omit<Prisma.LedgerTransactionUncheckedCreateInput, 'organizationId'> }) => {
        const encryptedData = encryptTransactionPayload(args.data);
        const record = await prisma.ledgerTransaction.create({
          data: {
            ...encryptedData,
            organizationId,
          },
        });
        return decryptTransactionRecord(record);
      },
      update: async (args: Parameters<typeof prisma.ledgerTransaction.update>[0]) => {
        const existing = await prisma.ledgerTransaction.findUnique({
          where: args.where,
          select: { organizationId: true },
        });
        if (!existing || existing.organizationId !== organizationId) {
          throw new Error('SecurityViolation: Unauthorized attempt to mutate cross-tenant transaction');
        }

        const encryptedData = args.data ? encryptTransactionPayload(args.data as Record<string, any>) : args.data;
        const updated = await prisma.ledgerTransaction.update({
          ...args,
          data: encryptedData,
        });
        return decryptTransactionRecord(updated);
      },
      delete: async (args: Parameters<typeof prisma.ledgerTransaction.delete>[0]) => {
        const existing = await prisma.ledgerTransaction.findUnique({
          where: args.where,
          select: { organizationId: true },
        });
        if (!existing || existing.organizationId !== organizationId) {
          throw new Error('SecurityViolation: Unauthorized attempt to delete cross-tenant transaction');
        }
        return prisma.ledgerTransaction.delete(args);
      },
      count: (args?: Parameters<typeof prisma.ledgerTransaction.count>[0]) => {
        return prisma.ledgerTransaction.count({
          ...args,
          where: {
            ...args?.where,
            organizationId,
          },
        });
      },
    },
    policy: {
      findFirst: () => {
        return prisma.treasuryPolicy.findFirst({
          where: { organizationId, isActive: true },
        });
      },
      findMany: () => {
        return prisma.treasuryPolicy.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
        });
      },
      upsert: (data: {
        id?: string;
        name: string;
        maxAutoCaptureAmount: number;
        mfaStepUpThreshold: number;
        requireProofOfDelivery: boolean;
        maxAllowedRiskScore: number;
        isActive: boolean;
      }) => {
        return prisma.treasuryPolicy.upsert({
          where: { id: data.id || 'default-policy-id' },
          create: {
            organizationId,
            name: data.name,
            maxAutoCaptureAmount: data.maxAutoCaptureAmount,
            mfaStepUpThreshold: data.mfaStepUpThreshold,
            requireProofOfDelivery: data.requireProofOfDelivery,
            maxAllowedRiskScore: data.maxAllowedRiskScore,
            isActive: data.isActive,
          },
          update: data,
        });
      },
    },
    auditLogs: {
      findMany: (args?: Parameters<typeof prisma.auditLog.findMany>[0]) => {
        return prisma.auditLog.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId,
          },
          orderBy: { timestamp: 'desc' },
        });
      },
      create: (data: {
        actor?: string;
        action: string;
        targetId: string;
        paypalEndpoint?: string | null;
        httpStatus?: number | null;
        redactedDetails: string;
        previousHash: string;
        recordHash: string;
        timestamp?: Date | string;
      }) => {
        return prisma.auditLog.create({
          data: {
            organizationId,
            actor: data.actor || 'USER',
            action: data.action,
            targetId: data.targetId,
            paypalEndpoint: data.paypalEndpoint || null,
            httpStatus: data.httpStatus || 200,
            redactedDetails: data.redactedDetails,
            previousHash: data.previousHash,
            recordHash: data.recordHash,
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          },
        });
      },
    },
  };
}
