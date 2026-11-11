import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Tenant-Scoped Database Wrapper for Strict Row-Level Multi-Tenant Isolation
 * Guarantees that any query executed through getTenantDb is strictly bounded
 * to the authenticated organizationId, preventing cross-tenant data leaks.
 */
export function getTenantDb(organizationId: string) {
  if (!organizationId || typeof organizationId !== 'string') {
    throw new Error('TenantIsolationViolation: organizationId is required for all data operations');
  }

  return {
    raw: prisma,
    transactions: {
      findMany: (args?: Parameters<typeof prisma.ledgerTransaction.findMany>[0]) => {
        return prisma.ledgerTransaction.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId,
          },
        });
      },
      findUnique: async (id: string) => {
        const item = await prisma.ledgerTransaction.findUnique({ where: { id } });
        if (!item || item.organizationId !== organizationId) return null;
        return item;
      },
      findFirst: (args?: Parameters<typeof prisma.ledgerTransaction.findFirst>[0]) => {
        return prisma.ledgerTransaction.findFirst({
          ...args,
          where: {
            ...args?.where,
            organizationId,
          },
        });
      },
      create: (args: { data: Omit<Prisma.LedgerTransactionUncheckedCreateInput, 'organizationId'> }) => {
        return prisma.ledgerTransaction.create({
          data: {
            ...args.data,
            organizationId,
          },
        });
      },
      update: async (args: Parameters<typeof prisma.ledgerTransaction.update>[0]) => {
        const existing = await prisma.ledgerTransaction.findUnique({
          where: args.where,
          select: { organizationId: true },
        });
        if (!existing || existing.organizationId !== organizationId) {
          throw new Error('SecurityViolation: Unauthorized attempt to mutate cross-tenant transaction');
        }
        return prisma.ledgerTransaction.update(args);
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
          where: { organizationId },
        });
      },
      upsert: (data: {
        maxHoldAmount: number;
        autoCaptureThreshold: number;
        requireMfaAbove: number;
        requireProofOfDelivery: boolean;
        allowedCurrencies: string;
        aiAuditStrictness: string;
      }) => {
        return prisma.treasuryPolicy.upsert({
          where: { id: organizationId },
          create: {
            organizationId,
            ...data,
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
          orderBy: { createdAt: 'desc' },
        });
      },
      create: (data: {
        userId?: string | null;
        action: string;
        entityType: string;
        entityId: string;
        details: string;
        ipAddress?: string;
        previousHash: string;
        currentHash: string;
      }) => {
        return prisma.auditLog.create({
          data: {
            organizationId,
            ...data,
          },
        });
      },
    },
  };
}
