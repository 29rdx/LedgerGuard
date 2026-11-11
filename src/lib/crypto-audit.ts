import crypto from 'crypto';
import { prisma } from './db';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function computeBlockHash(
  previousHash: string,
  timestampIso: string,
  actor: string,
  action: string,
  details: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${previousHash}:${timestampIso}:${actor}:${action}:${details}`)
    .digest('hex');
}

export interface HashChainVerificationResult {
  isValid: boolean;
  totalLogsChecked: number;
  genesisHash: string;
  latestHash: string;
  brokenAtId?: string;
  details: string;
}

/**
 * Traverses the tenant's cryptographic audit trail and verifies that no record
 * has been modified, deleted, or backdated.
 */
export async function verifyAuditLogChain(organizationId: string): Promise<HashChainVerificationResult> {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { timestamp: 'asc' },
  });

  if (logs.length === 0) {
    return {
      isValid: true,
      totalLogsChecked: 0,
      genesisHash: GENESIS_HASH,
      latestHash: GENESIS_HASH,
      details: 'Audit trail is empty; genesis state intact.',
    };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    if (entry.previousHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalLogsChecked: i + 1,
        genesisHash: GENESIS_HASH,
        latestHash: entry.recordHash,
        brokenAtId: entry.id,
        details: `Cryptographic chain broken at entry index ${i} (${entry.id}). Previous hash mismatch.`,
      };
    }

    const calculatedHash = computeBlockHash(
      entry.previousHash,
      entry.timestamp.toISOString(),
      entry.actor,
      entry.action,
      entry.redactedDetails
    );

    if (calculatedHash !== entry.recordHash) {
      return {
        isValid: false,
        totalLogsChecked: i + 1,
        genesisHash: GENESIS_HASH,
        latestHash: entry.recordHash,
        brokenAtId: entry.id,
        details: `Tamper detected: Recomputed SHA-256 digest ${calculatedHash} does not match recorded digest ${entry.recordHash}.`,
      };
    }

    expectedPrevHash = entry.recordHash;
  }

  return {
    isValid: true,
    totalLogsChecked: logs.length,
    genesisHash: GENESIS_HASH,
    latestHash: logs[logs.length - 1].recordHash,
    details: `All ${logs.length} hash-chained cryptographic blocks verified with 100% mathematical integrity.`,
  };
}
